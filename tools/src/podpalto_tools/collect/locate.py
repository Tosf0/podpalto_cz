"""Seller address and location for the export to the web app (spec sections 5.1-5.3).

Deterministic code only (ARES + RÚIAN), run by a person with ``podpalto-locate-sellers``.
The result is written to ``seller_locations.json`` next to the registry and committed, so
every change of a seller's place shows in the git diff and the export needs no network.

Where the location comes from, in this order:

1. ``location.ruian`` in the registry: the address point of the yard or shop.
2. ``location`` coordinates in the registry: a yard without an address point.
3. The company seat from ARES, flagged ``location_is_registered_office``: often the yard
   itself, but not always (a Prague seat, a yard in Vimperk). Confirm it by copying the code
   to ``location.ruian``, or give the yard's code instead.
4. Nothing: ``location_unknown``; the web app keeps such a seller off the map.

The region (kraj) is read from the point itself, so a seller whose registry region differs
from its location gets ``location_region_mismatch`` and goes to manual review.
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from datetime import datetime, timezone
from importlib import resources
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from podpalto_tools.collect.ares import Company, lookup_company
from podpalto_tools.collect.collector import Fetch, FetchError
from podpalto_tools.collect.ruian import address_point, format_zip, region_at
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.schemas import Region

LOCATIONS_FILE = "seller_locations.json"


class SellerAddress(BaseModel):
    street: str = ""
    city: str
    zip: str
    region: str = Field(..., description="Region code of the web app (PHA, STC, ...)")
    ruian_address_code: int | None = None


class SellerPoint(BaseModel):
    lat: float
    lng: float
    source: Literal["ruian", "seller_map", "manual"]
    precision: Literal["address_point", "building", "street", "municipality"]


class SellerRegistry(BaseModel):
    status: Literal["verified", "ceased", "not_in_ares", "no_ico", "error"]
    ico: str | None = None
    name: str | None = None
    seat: str | None = None


class LocatedSeller(BaseModel):
    """One seller as the export sends it to ``sellers`` (address, location, registry)."""

    seller_key: str
    source_id: str
    address: SellerAddress | None = None
    location: SellerPoint | None = None
    registry: SellerRegistry
    checked_at: str
    flags: list[str] = Field(default_factory=list)
    detail: str = ""
    note: str = Field("", description="Where the yard's address comes from (registry)")


def locate_seller(source: Source, fetch: Fetch, now: datetime | None = None) -> LocatedSeller:
    """Address and location of the seller behind a source; never raises on network errors."""
    checked_at = (now or datetime.now(timezone.utc)).isoformat(timespec="seconds")
    notes: list[str] = []
    company: Company | None = None
    if source.ico is None:
        registry = SellerRegistry(status="no_ico")
    else:
        try:
            company = lookup_company(source.ico, fetch)
        except FetchError as exc:
            registry = SellerRegistry(status="error", ico=source.ico)
            notes.append(f"ARES: {exc}")
        else:
            if company is None:
                registry = SellerRegistry(status="not_in_ares", ico=source.ico)
            else:
                registry = SellerRegistry(
                    status="verified" if company.active else "ceased",
                    ico=company.ico, name=company.name, seat=company.address,
                )  # fmt: skip
    flags = ["ico_not_found"] if registry.status in ("no_ico", "not_in_ares") else []

    seller = LocatedSeller(
        seller_key=source.export_seller_key, source_id=source.id, registry=registry,
        checked_at=checked_at, flags=flags, note=source.location.note if source.location else "",
    )  # fmt: skip
    expected = source.region if source.region not in (None, Region.CZ) else None
    try:
        _place(seller, source, company, fetch, expected)
    except FetchError as exc:
        notes.append(f"RÚIAN: {exc}")
    if seller.location is None and "location_unknown" not in seller.flags:
        seller.flags.append("location_unknown")
    seller.detail = "; ".join(filter(None, [*notes, seller.detail]))
    return seller


def _place(
    seller: LocatedSeller,
    source: Source,
    company: Company | None,
    fetch: Fetch,
    expected: Region | None,
) -> None:
    configured = source.location
    if configured is not None and configured.ruian is None:
        # Coordinates from the registry: a yard without an address point.
        assert configured.lat is not None and configured.lng is not None
        assert configured.city is not None and configured.zip is not None
        region = region_at(configured.lat, configured.lng, fetch)
        seller.location = SellerPoint(
            lat=configured.lat, lng=configured.lng,
            source="seller_map" if configured.from_seller_map else "manual",
            precision=configured.precision,
        )  # fmt: skip
        if configured.from_seller_map:
            seller.flags.append("location_from_seller_map")
        _set_address(seller, configured.street, configured.city, format_zip(configured.zip),
                     region, expected, None)  # fmt: skip
        return

    code = configured.ruian if configured is not None else None
    if code is None and company is not None:
        code = company.seat_ruian_code
        if code is not None:
            seller.flags.append("location_is_registered_office")
    if code is None:
        seller.detail = "no address point: add location to the registry"
        return
    point = address_point(code, fetch)
    if point is None:
        seller.detail = f"RÚIAN does not know address point {code}"
        return
    region = region_at(point.lat, point.lng, fetch)
    seller.location = SellerPoint(
        lat=point.lat, lng=point.lng, source="ruian", precision="address_point"
    )
    _set_address(seller, point.street, point.city, point.zip, region, expected, point.code)


def _set_address(
    seller: LocatedSeller,
    street: str,
    city: str,
    zip_code: str,
    region: Region | None,
    expected: Region | None,
    code: int | None,
) -> None:
    if region is not None and expected is not None and region is not expected:
        seller.flags.append("location_region_mismatch")
        seller.detail = f"the point lies in {region.value}, the registry says {expected.value}"
    chosen = region or expected
    if chosen is None or chosen.code is None:
        seller.flags.append("location_unknown")
        seller.detail = "the region of the point is not known"
        seller.location = None
        return
    seller.address = SellerAddress(
        street=street, city=city, zip=zip_code, region=chosen.code, ruian_address_code=code
    )


def locate_sellers(
    sources: list[Source],
    fetch: Fetch,
    sleep: Callable[[float], None] = time.sleep,
    pause_s: float = 0.5,
) -> list[LocatedSeller]:
    """One record per seller key; a seller read by several sources is located once."""
    located: dict[str, LocatedSeller] = {}
    for number, source in enumerate(sources):
        if source.export_seller_key in located or source.seller_key is not None:
            continue  # the first source of the seller carries its place
        if number:
            sleep(pause_s)
        located[source.export_seller_key] = locate_seller(source, fetch)
    return list(located.values())


def locations_path() -> Path:
    return Path(str(resources.files("podpalto_tools.collect").joinpath(LOCATIONS_FILE)))


def load_locations(path: Path | None = None) -> dict[str, LocatedSeller]:
    """The committed locations by seller key; empty when the file does not exist yet."""
    path = path or locations_path()
    if not path.is_file():
        return {}
    rows = json.loads(path.read_text(encoding="utf-8"))
    return {row["seller_key"]: LocatedSeller.model_validate(row) for row in rows}


def save_locations(found: list[LocatedSeller], path: Path | None = None) -> Path:
    """Merge with the stored file (sellers not checked now are kept), sorted for git diffs."""
    path = path or locations_path()
    merged = load_locations(path)
    merged.update({seller.seller_key: seller for seller in found})
    rows = [merged[key].model_dump(mode="json") for key in sorted(merged)]
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return path
