"""Address points from RÚIAN, the Czech register of addresses (ČÚZK).

Deterministic code, no LLM and no fuzzy geocoding: an address point is looked up by its
code (``kód adresního místa``), which ARES gives for every company seat and which a person
can look up for a yard at https://vdp.cuzk.cz. The ČÚZK text geocoder is not used: it
answers "Ústrašín 65" with Stráž nad Ohří at score 100.

Public ArcGIS REST service of ČÚZK, no key; ags.cuzk.cz has no robots.txt.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from urllib.parse import urlencode

from podpalto_tools.collect.collector import Fetch, FetchError
from podpalto_tools.schemas import Region

SERVICE = (
    "https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Prohlizeci_sluzba_nad_daty_RUIAN/MapServer"
)
ADDRESS_POINTS = 1  # layer AdresniMisto
STREETS = 4  # layer Ulice
MUNICIPALITIES = 12  # layer Obec
REGIONS = 17  # layer VyssiUzemneSamospravnyCelek (kraje)


@dataclass(frozen=True)
class AddressPoint:
    code: int
    text: str
    """As RÚIAN writes it: 'Hříběcí 65, 39301 Horní Cerekev', 'č.p. 65, 39301 Ústrašín'."""
    street: str
    """'Hříběcí 65', 'Žitavského 496'; a village without streets gives 'Ústrašín 65'."""
    city: str
    zip: str
    """'393 01', the format of the web app."""
    lat: float
    lng: float


def _query(layer: int, fetch: Fetch, **params: str) -> list[dict]:
    url = f"{SERVICE}/{layer}/query?" + urlencode({"f": "json", **params})
    response = fetch(url)
    if response.status != 200:
        raise FetchError(f"RÚIAN returned HTTP {response.status}")
    data = json.loads(response.content)
    if "error" in data:
        raise FetchError(f"RÚIAN: {data['error'].get('message', data['error'])}")
    return data.get("features", [])


def format_zip(psc: int | str) -> str:
    digits = re.sub(r"\D", "", str(psc)).zfill(5)
    return f"{digits[:3]} {digits[3:]}"


def split_address(text: str) -> tuple[str, str, str]:
    """(street, city, zip) of a RÚIAN address text.

    'Žitavského 496, Zbraslav, 15600 Praha 5' -> ('Žitavského 496', 'Praha 5', '156 00');
    'č.p. 65, 39301 Ústrašín' -> ('Ústrašín 65', 'Ústrašín', '393 01').
    """
    parts = [part.strip() for part in text.split(",")]
    match = re.fullmatch(r"(\d{3}\s?\d{2})\s+(.+)", parts[-1])
    if not match:
        raise ValueError(f"unexpected RÚIAN address {text!r}")
    zip_code, city = format_zip(match.group(1)), match.group(2)
    street = parts[0] if len(parts) > 1 else ""
    if number := re.fullmatch(r"č\.\s?p\.\s*(\S+)", street):
        # No streets in the village: Czech addresses write '<part of village> <number>'.
        village = parts[1] if len(parts) > 2 else city
        street = f"{village} {number.group(1)}"
    return street, city, zip_code


def address_point(code: int, fetch: Fetch) -> AddressPoint | None:
    """The address point with this code, or None when RÚIAN does not know it."""
    features = _query(
        ADDRESS_POINTS, fetch, where=f"kod={int(code)}", outFields="kod,adresa",
        returnGeometry="true", outSR="4326",
    )  # fmt: skip
    if not features:
        return None
    attributes, geometry = features[0]["attributes"], features[0]["geometry"]
    street, city, zip_code = split_address(attributes["adresa"])
    return AddressPoint(
        code=attributes["kod"], text=attributes["adresa"], street=street, city=city,
        zip=zip_code, lat=round(geometry["y"], 6), lng=round(geometry["x"], 6),
    )  # fmt: skip


def find_address_points(
    zip_code: str, house_number: int, city: str, fetch: Fetch
) -> list[tuple[int, str]]:
    """(code, address) of the points with this PSČ and house number in the given town.

    One PSČ covers several villages, so the town name must appear in the address. Used by
    a person to find the code of a yard; the result goes to the registry after a check.
    """
    psc = re.sub(r"\D", "", zip_code)
    features = _query(
        ADDRESS_POINTS, fetch, where=f"psc={int(psc)} AND cislodomovni={int(house_number)}",
        outFields="kod,adresa", returnGeometry="false",
    )  # fmt: skip
    wanted = city.casefold()
    return sorted(
        (f["attributes"]["kod"], f["attributes"]["adresa"])
        for f in features
        if wanted in f["attributes"]["adresa"].casefold()
    )


def _quoted(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def street_point(street: str, city: str, fetch: Fetch) -> tuple[float, float] | None:
    """(lat, lng) of the middle of a street, for a yard published as 'Nádražní ulice'.

    The vertex of the street line nearest to the average of all its vertices, so the point
    lies on the street. Precision is 'street': only for yards without a house number.
    """
    towns = _query(
        MUNICIPALITIES, fetch, where=f"nazev={_quoted(city)}", outFields="kod",
        returnGeometry="false",
    )  # fmt: skip
    for town in towns:
        streets = _query(
            STREETS, fetch, where=f"nazev={_quoted(street)} AND obec={town['attributes']['kod']}",
            outFields="kod", returnGeometry="true", outSR="4326",
        )  # fmt: skip
        points = [
            point for feature in streets for path in feature["geometry"]["paths"] for point in path
        ]
        if points:
            mean_x = sum(x for x, _ in points) / len(points)
            mean_y = sum(y for _, y in points) / len(points)
            x, y = min(points, key=lambda p: (p[0] - mean_x) ** 2 + (p[1] - mean_y) ** 2)
            return round(y, 6), round(x, 6)
    return None


def region_at(lat: float, lng: float, fetch: Fetch) -> Region | None:
    """The region (kraj) the point lies in, or None outside the Czech Republic."""
    features = _query(
        REGIONS, fetch, geometry=f"{lng},{lat}", geometryType="esriGeometryPoint",
        inSR="4326", spatialRel="esriSpatialRelIntersects", outFields="nazev",
        returnGeometry="false",
    )  # fmt: skip
    for feature in features:
        try:
            return Region(feature["attributes"]["nazev"])
        except ValueError:
            continue
    return None
