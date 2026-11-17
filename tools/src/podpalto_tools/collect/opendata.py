"""Open statistical data (pillar 5 of the PDF report), downloaded once and read by code.

Census 2021 (ČSÚ, Sčítání lidu, domů a bytů): occupied dwellings by the main energy source
used for heating, per region (kraj). It tells where households heat with coal, wood or
pellets: demand, not sales. The ČSÚ price surveys do not cover solid fuels item by item
(the field survey of average consumer prices ended in January 2026), so prices come from
the sellers and this data adds the regional demand side.

    uv run podpalto-load-opendata     # downloads the CSV (12 MB) and keeps a small summary
"""

from __future__ import annotations

import csv
import io
import json
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path

from podpalto_tools.collect.collector import Fetch, FetchError
from podpalto_tools.settings import Settings

CENSUS_HEATING_URL = (
    "https://csu.gov.cz/docs/107508/cf59a324-f403-7444-58c3-7b26bdbf01ec/"
    "sldb2021_byty_energie.csv?version=1.0"
)
CENSUS_HEATING_PAGE = "https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data"
CENSUS_DATE = "2021-03-26"

# Census category -> our group. Groups follow the fuel categories of the price records.
HEATING_GROUPS = {
    "Uhlí, koks, uhelné brikety": "coal_coke_briquettes",
    "Dřevo, dřevěné brikety": "wood_and_wood_briquettes",
    "Dřevěné pelety": "wood_pellets",
}


def summary_path(settings: Settings) -> Path:
    return settings.data_dir / "opendata" / "census2021_heating.json"


def parse_census_heating(content: bytes) -> dict[str, dict[str, int]]:
    """Region (and 'CZ') -> dwellings in total and per solid-fuel group."""
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    regions: dict[str, dict[str, int]] = {}
    for row in reader:
        level = row["uzemi_typ"]
        if level not in ("kraj", "stát"):
            continue
        name = "CZ" if level == "stát" else row["uzemi_txt"]
        counts = regions.setdefault(name, {"total": 0, **dict.fromkeys(HEATING_GROUPS.values(), 0)})
        value = int(row["hodnota"] or 0)
        if not row["energie_txt"]:
            counts["total"] = value
        elif row["energie_txt"] in HEATING_GROUPS:
            counts[HEATING_GROUPS[row["energie_txt"]]] = value
    if "CZ" not in regions or len(regions) != 15:
        raise ValueError(f"unexpected census file: {len(regions)} territories instead of 15")
    return regions


def load_census_heating(fetch: Fetch, settings: Settings) -> Path:
    """Download the census CSV (robots.txt respected), keep a raw copy and a summary."""
    robots = fetch("https://csu.gov.cz/robots.txt")
    if robots.status == 200:
        parser = urllib.robotparser.RobotFileParser()
        parser.parse(robots.content.decode("utf-8", errors="replace").splitlines())
        if not parser.can_fetch(settings.user_agent, CENSUS_HEATING_URL):
            raise PermissionError("robots.txt of csu.gov.cz disallows the census file")
    response = fetch(CENSUS_HEATING_URL)
    if response.status != 200:
        raise FetchError(f"census file returned HTTP {response.status}")
    regions = parse_census_heating(response.content)

    raw = settings.raw_dir / "opendata" / "sldb2021_byty_energie.csv"
    raw.parent.mkdir(parents=True, exist_ok=True)
    raw.write_bytes(response.content)
    target = summary_path(settings)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(
            {
                "source": CENSUS_HEATING_PAGE,
                "census_date": CENSUS_DATE,
                "downloaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "regions": regions,
            },
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )
    return target
