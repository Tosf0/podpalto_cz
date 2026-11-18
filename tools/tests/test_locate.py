"""Seller address and location from ARES and RÚIAN. No network: both services are faked."""

import json
from urllib.parse import parse_qs, urlsplit

import pytest
from podpalto_tools.collect.ares import ARES_URL
from podpalto_tools.collect.collector import FetchResponse
from podpalto_tools.collect.locate import load_locations, locate_seller, save_locations
from podpalto_tools.collect.ruian import SERVICE, split_address, street_point
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.schemas import REGION_CODES, Region

SEAT, YARD = 20113498, 25000001
POINTS = {
    SEAT: ("Olgy Havlové 2903/27, Žižkov, 13000 Praha 3", 14.481801, 50.088683),
    YARD: ("č.p. 65, 39301 Ústrašín", 15.168108, 49.381439),
}


def kraj(lng: float) -> str:
    return "Hlavní město Praha" if lng < 15 else "Kraj Vysočina"


class Services:
    """ARES and the two RÚIAN layers, answering like the real ones."""

    def __init__(self, ares: dict | None = None):
        self.ares = ares
        self.requested: list[str] = []

    def __call__(self, url: str) -> FetchResponse:
        self.requested.append(url)
        if url.startswith(ARES_URL.split("{")[0]):
            if self.ares is None:
                return FetchResponse(404, b"")
            return FetchResponse(200, json.dumps(self.ares).encode())
        assert url.startswith(SERVICE)
        query = {k: v[0] for k, v in parse_qs(urlsplit(url).query).items()}
        layer = urlsplit(url).path.rsplit("/", 2)[-2]
        if layer == "1":
            code = int(query["where"].removeprefix("kod="))
            features = []
            if code in POINTS:
                text, x, y = POINTS[code]
                features = [{"attributes": {"kod": code, "adresa": text},
                             "geometry": {"x": x, "y": y}}]  # fmt: skip
        elif layer == "12":  # municipality by name
            features = [{"attributes": {"kod": 547492}}] if "Pelhřimov" in query["where"] else []
        elif layer == "4":  # street line: two segments, the middle vertex is (15.2, 49.4)
            paths = [[[15.0, 49.4], [15.2, 49.4]], [[15.2, 49.4], [15.5, 49.4]]]
            features = [{"attributes": {"kod": 1}, "geometry": {"paths": paths}}]
        else:
            lng = float(query["geometry"].split(",")[0])
            features = [{"attributes": {"nazev": kraj(lng)}}]
        return FetchResponse(200, json.dumps({"features": features}).encode())


def source(**fields) -> Source:
    return Source.model_validate({
        "id": "demo", "seller": "Demo", "base_url": "https://demo.example",
        "kind": "static_html", "page_paths": ["/cenik/"], **fields,
    })  # fmt: skip


COMPANY = {"ico": "49901982", "obchodniJmeno": "Demo Uhlí s.r.o.",
           "sidlo": {"textovaAdresa": "Olgy Havlové 2903/27, Praha 3",
                     "nazevKraje": "Hlavní město Praha", "kodAdresnihoMista": SEAT}}  # fmt: skip


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Žitavského 496, Zbraslav, 15600 Praha 5", ("Žitavského 496", "Praha 5", "156 00")),
        ("č.p. 65, 39301 Ústrašín", ("Ústrašín 65", "Ústrašín", "393 01")),
        ("č.p. 14, Olešná, 59231 Nové Město na Moravě",
         ("Olešná 14", "Nové Město na Moravě", "592 31")),
    ],
)  # fmt: skip
def test_ruian_address_text_is_split_into_street_city_and_zip(text, expected):
    assert split_address(text) == expected


def test_every_region_has_a_web_app_code():
    assert set(REGION_CODES) == set(Region) - {Region.CZ}
    assert Region.VYSOCINA.code == "VYS" and Region.CZ.code is None


def test_without_a_yard_the_company_seat_is_used_and_flagged():
    seller = locate_seller(source(ico="49901982"), Services(COMPANY))
    assert seller.seller_key == "demo" and seller.registry.status == "verified"
    assert seller.address.model_dump() == {
        "street": "Olgy Havlové 2903/27", "city": "Praha 3", "zip": "130 00",
        "region": "PHA", "ruian_address_code": SEAT,
    }  # fmt: skip
    assert (seller.location.source, seller.location.precision) == ("ruian", "address_point")
    assert seller.flags == ["location_is_registered_office"]


def test_the_yard_from_the_registry_wins_and_the_region_comes_from_the_point():
    yard = source(ico="49901982", region="Kraj Vysočina", location={"ruian": YARD})
    seller = locate_seller(yard, Services(COMPANY))
    assert (seller.address.street, seller.address.region) == ("Ústrašín 65", "VYS")
    assert seller.flags == []


def test_seat_in_another_region_than_the_registry_goes_to_review():
    seller = locate_seller(source(ico="49901982", region="Kraj Vysočina"), Services(COMPANY))
    assert seller.address.region == "PHA"
    assert seller.flags == ["location_is_registered_office", "location_region_mismatch"]


def test_manual_coordinates_for_a_yard_without_an_address_point():
    yard = source(location={"lat": 49.38, "lng": 15.17, "city": "Ústrašín", "zip": "39301",
                            "precision": "street"})  # fmt: skip
    seller = locate_seller(yard, Services())
    assert (seller.location.source, seller.location.precision) == ("manual", "street")
    assert (seller.address.zip, seller.address.region) == ("393 01", "VYS")
    assert seller.flags == ["ico_not_found"]


def test_coordinates_from_the_seller_map_are_flagged():
    yard = source(location={"lat": 49.38, "lng": 15.17, "city": "Ústrašín", "zip": "39301",
                            "from_seller_map": True, "note": "/kontakty: mapa Google"})  # fmt: skip
    seller = locate_seller(yard, Services())
    assert (seller.location.source, seller.note) == ("seller_map", "/kontakty: mapa Google")
    assert seller.flags == ["ico_not_found", "location_from_seller_map"]


def test_street_point_is_a_vertex_in_the_middle_of_the_street():
    assert street_point("Libkovodská", "Pelhřimov", Services()) == (49.4, 15.2)
    assert street_point("Libkovodská", "Neexistuje", Services()) is None


def test_no_ico_and_no_location_is_unknown_and_reads_no_seller_page():
    services = Services()
    seller = locate_seller(source(), services)
    assert seller.address is None and seller.location is None
    assert seller.flags == ["ico_not_found", "location_unknown"]
    assert services.requested == []


def test_registry_location_takes_a_code_or_coordinates():
    with pytest.raises(ValueError, match="needs ruian"):
        source(location={"city": "Ústrašín"})
    with pytest.raises(ValueError, match="not both"):
        source(location={"ruian": YARD, "lat": 49.38, "lng": 15.17, "city": "X",
                         "zip": "39301"})  # fmt: skip


def test_saved_locations_are_merged_and_sorted(tmp_path):
    path = tmp_path / "seller_locations.json"
    first = locate_seller(source(id="zeta"), Services())
    second = locate_seller(source(id="alfa", ico="49901982"), Services(COMPANY))
    save_locations([first], path)
    save_locations([second], path)
    assert list(load_locations(path)) == ["alfa", "zeta"]
    assert [row["seller_key"] for row in json.loads(path.read_text("utf-8"))] == ["alfa", "zeta"]
