"""Seller identity: IČO on the seller's pages and its check in ARES. No network."""

import json

import pytest
from podpalto_tools.collect.ares import ARES_URL, find_icos, valid_ico, verify_seller
from podpalto_tools.collect.collector import FetchResponse
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.settings import get_settings

ORIGIN = "https://demosklad.example"
SOURCE = Source.model_validate({
    "id": "demosklad", "seller": "DemoSklad", "base_url": ORIGIN, "kind": "static_html",
    "page_paths": ["/cenik/"], "region": "Kraj Vysočina",
})  # fmt: skip
# 49901982 has a valid check digit; 12345678 does not.
ARES_RECORD = {
    "ico": "49901982", "obchodniJmeno": "Demo Uhlí s.r.o.",
    "sidlo": {"textovaAdresa": "Nádražní 1, 59231 Nové Město na Moravě",
              "nazevKraje": "Kraj Vysočina"},
}  # fmt: skip


@pytest.mark.parametrize(
    ("ico", "valid"),
    [("49901982", True), ("25596641", True), ("12345678", False), ("4990198", False)],
)
def test_check_digit(ico, valid):
    assert valid_ico(ico) is valid


def test_find_icos_skips_phone_numbers_and_vat_ids():
    text = (
        "Tel: 603 269 384 | DIČ: CZ49901982\nIČ: 499 01 982\nIČO:25596641\n"
        "IČ 12345678 (neplatné)\nIČ: 49901982"
    )
    assert find_icos(text) == ["49901982", "25596641"]
    # Label and number in two table cells (waldera.cz/kontakty).
    assert find_icos("IČ: | 49901982\nDIČ: | CZ49901982") == ["49901982"]


class Site:
    def __init__(self, pages):
        self.pages = {f"{ORIGIN}/robots.txt": (404, b""), **pages}
        self.requested: list[str] = []

    def __call__(self, url):
        self.requested.append(url)
        status, body = self.pages.get(url, (404, b""))
        return FetchResponse(status, body)


def check(site):
    return verify_seller(SOURCE, site, get_settings(), sleep=lambda s: None)


def test_ico_from_the_legal_page_is_checked_in_ares():
    site = Site({
        f"{ORIGIN}/cenik/": (200, "<p>Ořech 2 690 Kč/q</p>".encode()),
        f"{ORIGIN}/obchodni-podminky/": (200, "<p>Provozovatel: Demo, IČ: 49901982</p>".encode()),
        ARES_URL.format(ico="49901982"): (200, json.dumps(ARES_RECORD).encode()),
    })  # fmt: skip
    result = check(site)
    assert (result.status, result.ico, result.found_on) == (
        "verified", "49901982", f"{ORIGIN}/obchodni-podminky/",
    )  # fmt: skip
    assert (result.ares_name, result.ares_region, result.region_matches) == (
        "Demo Uhlí s.r.o.", "Kraj Vysočina", True,
    )  # fmt: skip


def test_unknown_or_ceased_company_and_a_different_region():
    pages = {f"{ORIGIN}/cenik/": (200, "IČ: 49901982".encode())}
    assert check(Site(pages)).status == "not_in_ares"  # ARES answers 404

    ceased = ARES_RECORD | {"datumZaniku": "2020-01-01"}
    pages[ARES_URL.format(ico="49901982")] = (200, json.dumps(ceased).encode())
    assert check(Site(pages)).status == "ceased"

    moved = ARES_RECORD | {"sidlo": {"textovaAdresa": "Praha", "nazevKraje": "Hlavní město Praha"}}
    pages[ARES_URL.format(ico="49901982")] = (200, json.dumps(moved).encode())
    assert check(Site(pages)).region_matches is False


def test_no_ico_and_robots_are_respected():
    site = Site({f"{ORIGIN}/robots.txt": (200, b"User-agent: *\nDisallow: /obchodni-podminky/\n")})
    result = check(site)
    assert result.status == "ico_not_found"
    assert f"{ORIGIN}/obchodni-podminky/" not in site.requested
