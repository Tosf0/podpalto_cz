"""Census 2021 heating data: parsing, loading and the heating_demand tool. No network;
the CSV has the layout of the ČSÚ file with made-up numbers."""

import csv
import io

import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import app
from podpalto_tools.collect.collector import FetchResponse
from podpalto_tools.collect.opendata import (
    CENSUS_HEATING_URL,
    load_census_heating,
    parse_census_heating,
)
from podpalto_tools.schemas import Region
from podpalto_tools.settings import get_settings

client = TestClient(app)
COLUMNS = ["idhod", "hodnota", "ukaz_kod", "energie_cis", "energie_kod", "uzemi_cis",
           "uzemi_kod", "sldb_rok", "sldb_datum", "ukaz_txt", "energie_txt", "uzemi_txt",
           "uzemi_typ"]  # fmt: skip


def census_csv() -> bytes:
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=COLUMNS)
    writer.writeheader()
    territories = [("CZ", "stát")] + [(r.value, "kraj") for r in Region if r is not Region.CZ]
    for number, (name, level) in enumerate(territories):
        coal = 10 * (number + 1)  # the last region has the highest coal share
        rows = [("", 1000), ("Uhlí, koks, uhelné brikety", coal), ("Dřevo, dřevěné brikety", 50),
                ("Dřevěné pelety", 5), ("Zemní plyn", 400)]  # fmt: skip
        for energy, value in rows:
            writer.writerow({"hodnota": value, "energie_txt": energy, "uzemi_txt": name,
                             "uzemi_typ": level, "ukaz_txt": "Počet obydlených bytů"})  # fmt: skip
    writer.writerow({"hodnota": 7, "energie_txt": "", "uzemi_txt": "Jihlava", "uzemi_typ": "obec"})
    return out.getvalue().encode("utf-8-sig")


def test_parse_keeps_regions_and_solid_fuel_groups():
    regions = parse_census_heating(census_csv())
    assert len(regions) == 15 and "Jihlava" not in regions
    assert regions["CZ"] == {"total": 1000, "coal_coke_briquettes": 10,
                             "wood_and_wood_briquettes": 50, "wood_pellets": 5}  # fmt: skip


def test_parse_rejects_a_different_file():
    with pytest.raises(ValueError, match="unexpected census file"):
        parse_census_heating(b"uzemi_typ,uzemi_txt,energie_txt,hodnota\nobec,X,,1\n")


@pytest.fixture
def loaded():
    def fetch(url):
        if url.endswith("/robots.txt"):
            return FetchResponse(404, b"")
        assert url == CENSUS_HEATING_URL
        return FetchResponse(200, census_csv())

    return load_census_heating(fetch, get_settings())


def test_tool_fails_clearly_before_loading():
    response = client.post("/tools/heating_demand", json={})
    assert response.status_code == 502 and "podpalto-load-opendata" in response.json()["detail"]


def test_tool_ranks_regions_by_the_fuel_group(loaded):
    body = client.post("/tools/heating_demand", json={"fuel_type": "brown_coal"}).json()
    assert body["mock"] is False and body["group"] == "coal_coke_briquettes"
    assert body["census_date"] == "2021-03-26"
    assert body["regions"][0]["region"] == "CZ"
    assert body["regions"][1]["region"] == "Moravskoslezský kraj"  # highest made-up share
    assert body["regions"][1]["share_pct"]["coal_coke_briquettes"] == 15.0

    one = client.post("/tools/heating_demand", json={"region": "Kraj Vysočina"}).json()
    assert [r["region"] for r in one["regions"]] == ["CZ", "Kraj Vysočina"]
