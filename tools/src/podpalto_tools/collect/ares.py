"""Seller identity: the company ID (IČO) on the seller's page, checked in ARES.

The source report (PDF, sections 4.2 and 4.4) asks the QA auditor to verify that every
seller has an existing IČO, because fake fuel shops with made-up company IDs exist
(Biomac warns about one). Both steps are deterministic code:

1. ``find_icos``  reads candidates from page text ("IČ: 12345678", "IČO 123 45 678") and
                  keeps only numbers with a valid check digit (mod 11).
2. ``lookup``     asks ARES, the public register of the Czech Ministry of Finance, for the
                  company's name, seat and region (kraj) and whether it still exists.
"""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable
from dataclasses import dataclass

from pydantic import BaseModel, Field

from podpalto_tools.collect.collector import (
    _REFUSED,
    Fetch,
    FetchError,
    _Failure,
    _load_robots,
)
from podpalto_tools.collect.pricelist import page_to_text
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.settings import Settings

ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}"

# "IČ: 12345678", "IČO 123 45 678", "IČ:12345678", "IČ: | 12345678" (label and number in
# two table cells); DIČ ("CZ12345678") is skipped.
_ICO = re.compile(r"(?<![A-Za-zĚŠČŘŽÝÁÍÉ])I[ČC]\s*O?\s*[:.]?\s*\|?\s*((?:\d\s?){7}\d)\b")


def valid_ico(ico: str) -> bool:
    """Check digit of a Czech company ID (weights 8..2, mod 11)."""
    if not re.fullmatch(r"\d{8}", ico):
        return False
    total = sum(int(digit) * weight for digit, weight in zip(ico[:7], range(8, 1, -1), strict=True))
    check = (11 - total % 11) % 10
    return check == int(ico[7])


def find_icos(text: str) -> list[str]:
    """Valid company IDs named on a page, in order of appearance, without duplicates."""
    found: list[str] = []
    for match in _ICO.finditer(text):
        ico = re.sub(r"\s", "", match.group(1))
        if valid_ico(ico) and ico not in found:
            found.append(ico)
    return found


@dataclass(frozen=True)
class Company:
    ico: str
    name: str
    address: str
    region: str | None
    active: bool
    seat_ruian_code: int | None = None
    """RÚIAN address point of the registered seat (``kodAdresnihoMista``); None when ARES
    holds a non-standardised address."""


def parse_ares(content: bytes) -> Company:
    """Company record from an ARES 'ekonomicke-subjekty' response."""
    data = json.loads(content)
    seat = data.get("sidlo") or {}
    return Company(
        ico=data["ico"],
        name=data.get("obchodniJmeno", ""),
        address=seat.get("textovaAdresa", ""),
        region=seat.get("nazevKraje"),
        active=not data.get("datumZaniku"),
        seat_ruian_code=seat.get("kodAdresnihoMista"),
    )


def lookup_company(ico: str, fetch: Fetch) -> Company | None:
    """The company in ARES, or None when ARES does not know the IČO.

    Raises ``FetchError`` when ARES cannot be reached or answers with an error.
    """
    response = fetch(ARES_URL.format(ico=ico))
    if response.status == 404:
        return None
    if response.status != 200:
        raise FetchError(f"ARES returned HTTP {response.status}")
    return parse_ares(response.content)


# Pages that usually name the operator: the home page footer, then the legal pages.
# Shoptet shops always publish /obchodni-podminky/.
CONTACT_PATHS = ["/", "/kontakt/", "/kontakty/", "/obchodni-podminky/"]


class SellerCheck(BaseModel):
    source_id: str
    seller: str
    registry_ico: str | None = None
    registry_region: str | None = None
    found_icos: list[str] = Field(default_factory=list)
    found_on: str | None = None
    ico: str | None = Field(None, description="The IČO checked in ARES")
    ares_name: str | None = None
    ares_address: str | None = None
    ares_region: str | None = None
    active: bool | None = None
    region_matches: bool | None = None
    status: str = "not_checked"
    """verified | ico_not_found | not_in_ares | ceased | error"""
    detail: str = ""


def verify_seller(
    source: Source,
    fetch: Fetch,
    settings: Settings,
    sleep: Callable[[float], None] = time.sleep,
) -> SellerCheck:
    """Find the seller's IČO on its pages (robots.txt respected) and check it in ARES."""
    check = SellerCheck(
        source_id=source.id,
        seller=source.seller,
        registry_ico=source.ico,
        registry_region=source.region.value if source.region else None,
    )
    try:
        allowed, crawl_delay = _load_robots(source, fetch, settings.user_agent)
    except _Failure as failure:
        check.status, check.detail = "error", failure.detail
        return check

    candidates = [source.ico] if source.ico else []
    urls = list(dict.fromkeys(source.page_urls + [source.origin + p for p in CONTACT_PATHS]))
    for number, url in enumerate(urls):
        if candidates:
            break
        if not allowed(url):
            continue
        if number:
            sleep(max(settings.page_delay_s, crawl_delay))
        try:
            response = fetch(url)
        except FetchError:
            continue
        if response.status in _REFUSED:
            check.status, check.detail = "error", f"{url} returned HTTP {response.status}"
            return check
        if response.status == 200:
            found = find_icos(page_to_text(response.content.decode("utf-8", errors="replace")))
            if found:
                candidates, check.found_on = found, url
    check.found_icos = candidates
    if not candidates:
        check.status, check.detail = "ico_not_found", f"no valid IČO on {len(urls)} pages"
        return check

    check.ico = candidates[0]
    try:
        response = fetch(ARES_URL.format(ico=check.ico))
    except FetchError as exc:
        check.status, check.detail = "error", f"ARES: {exc}"
        return check
    if response.status == 404:
        check.status, check.detail = "not_in_ares", "ARES does not know this IČO"
        return check
    if response.status != 200:
        check.status, check.detail = "error", f"ARES returned HTTP {response.status}"
        return check
    company = parse_ares(response.content)
    check.ares_name, check.ares_address = company.name, company.address
    check.ares_region, check.active = company.region, company.active
    if check.registry_region and company.region:
        check.region_matches = check.registry_region == company.region
    check.status = "verified" if company.active else "ceased"
    if len(candidates) > 1:
        check.detail = f"several IČO on the page, checked the first: {candidates}"
    return check
