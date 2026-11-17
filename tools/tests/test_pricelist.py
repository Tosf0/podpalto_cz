"""Price-list sources: page text, verification of the crew's quotes, storage.

The page is a synthetic price list of a fictional coal yard; no network is used.
"""

import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import create_app
from podpalto_tools.collect import collect_all
from podpalto_tools.collect.pricelist import page_to_text, parse_price, quote_found, unit_in

ORIGIN = "https://demosklad.example"
REGISTRY = f"""
sources:
  - id: demosklad
    seller: DemoSklad
    base_url: {ORIGIN}
    kind: static_html
    pillar: 2
    page_paths: [/cenik/]
    region: Kraj Vysočina
    price_region: Kraj Vysočina
    ico: "12345678"
"""
PAGE = """<html><head><title>Ceník</title><script>var tracking = 1;</script></head><body>
<nav><a href="/">Domů</a></nav>
<h1>Ceník uhlí</h1>
<p>Ceny platné od 1. 10. 2026, uvedeny včetně 21 % DPH.</p>
<table>
  <tr><th>Druh paliva</th><th>Cena za 1 q</th></tr>
  <tr><td>Hnědé uhlí Bílina Ořech 2</td><td>690 Kč/q</td></tr>
  <tr><td>Brikety Rekord 4"</td><td>850 Kč/q</td></tr>
  <tr><td>Koks 20–40 mm</td><td>1&nbsp;000 Kč/q</td></tr>
  <tr><td>Kovářské uhlí pytel 25 kg</td><td>480 Kč</td></tr>
</table>
<p>Doprava od 30 q zdarma, složení pásem 300 Kč.</p>
</body></html>""".encode()


class Yard:
    def __init__(self) -> None:
        self.pages = {f"{ORIGIN}/robots.txt": (404, b""), f"{ORIGIN}/cenik/": (200, PAGE)}
        self.requested: list[str] = []

    def __call__(self, url):
        from podpalto_tools.collect.collector import FetchResponse

        self.requested.append(url)
        status, body = self.pages.get(url, (404, b""))
        return FetchResponse(status, body)


@pytest.fixture
def yard(data_dir):
    (data_dir.parent / "sources.yaml").write_text(REGISTRY, encoding="utf-8")
    return Yard()


@pytest.fixture
def api(yard):
    return TestClient(create_app(fetch=yard, sleep=lambda _: None))


def row(name, price, unit, fuel, **extra):
    return {"product_name": name, "price_text": price, "original_unit": unit,
            "fuel_category": fuel, **extra}  # fmt: skip


ROWS = [
    row("Hnědé uhlí Bílina Ořech 2", "690 Kč/q", "q", "brown_coal", price_includes_vat=True,
        quality_standard="Bílina", delivery_note="Doprava od 30 q zdarma"),
    row('Brikety Rekord 4"', "850 Kč/q", "q", "coal_briquettes", price_includes_vat=True),
    row("Koks 20–40 mm", "1 000 Kč/q", "q", "coke", price_includes_vat=True),
    row("Kovářské uhlí pytel 25 kg", "480 Kč", "bag", "black_coal", package_text="pytel 25 kg",
        price_includes_vat=True),
    row("Doprava od 30 q zdarma", "300 Kč", "q", "brown_coal", qa_status="rejected",
        qa_note="delivery fee, not a fuel"),
]  # fmt: skip


def submit(api, page_id, rows, dry_run=False):
    body = {"pages": [{"page_id": page_id, "extraction": {"price_list_found": True,
                                                          "rows": rows}}]}  # fmt: skip
    return api.post(f"/sources/demosklad/extraction?dry_run={str(dry_run).lower()}", json=body)


# --- page text and quote checks -------------------------------------------------------------


def test_page_text_keeps_table_rows_on_one_line():
    text = page_to_text(PAGE.decode())
    assert "Hnědé uhlí Bílina Ořech 2 | 690 Kč/q" in text.splitlines()
    assert "var tracking" not in text
    assert text.splitlines()[0] == "Domů"


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("690 Kč/q", 690),
        ("1 000 Kč/q", 1000),
        ("6 900,50 Kč", 6900.5),
        ("Kč 1.270,50", 1270.5),
        ("690 Kč/100 kg", 690),
        ("679 / 665 / 645 Kč/q", None),  # three prices: the crew must quote one
        ("cena dohodou", None),
    ],
)
def test_parse_price(text, expected):
    assert parse_price(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [("690 Kč/q", "q"), ("7 100 Kč/t", "t"), ("1 200 Kč/PRMS", "prms"), ("2 290 Kč/prm", "prmr"),
     ("12,50 Kč/kg", "kg"), ("480 Kč", None)],
)  # fmt: skip
def test_unit_in(text, expected):
    assert unit_in(text) == expected


def test_quotes_may_span_cells_but_not_be_invented():
    text = page_to_text(PAGE.decode())
    assert quote_found("hnědé uhlí bílina ořech 2 690 Kč/q", text)
    assert quote_found("Koks 20-40 mm", text)  # dash variants do not matter
    assert not quote_found("Hnědé uhlí Bílina Ořech 1", text)


# --- the flow's steps through the API --------------------------------------------------------


def test_price_list_round_trip(api, yard):
    pages = api.post("/sources/demosklad/pages").json()
    assert pages["status"] == "ok"
    (page,) = pages["pages"]
    assert page["url"] == f"{ORIGIN}/cenik/" and "690 Kč/q" in page["text"]

    checked = submit(api, page["page_id"], ROWS, dry_run=True).json()
    assert (checked["status"], checked["accepted"], checked["rejected"]) == ("dry_run", 4, 0)
    assert api.post("/tools/eshop_catalog", json={"fuel_type": "coke"}).status_code == 502

    stored = submit(api, page["page_id"], ROWS).json()
    assert (stored["status"], stored["accepted"]) == ("ok", 4)
    prices = {
        v["record"]["fuel_category"]: v["record"]["normalized_price_per_ton_vat"]
        for v in stored["verdicts"]
    }
    assert prices == {"brown_coal": 6900, "coal_briquettes": 8500, "coke": 10000,
                      "black_coal": 19200}  # fmt: skip

    catalog = api.post(
        "/tools/eshop_catalog", json={"fuel_type": "brown_coal", "region": "Kraj Vysočina"}
    ).json()
    (coal,) = catalog["products"]
    assert (coal["seller"], coal["package"], coal["price_czk"]) == ("DemoSklad", "1 q", 690)
    assert (coal["unit_price_czk"], coal["price_per_kwh_czk"]) == (6900, 1.38)
    assert (coal["seller_region"], coal["quality_standard"]) == ("Kraj Vysočina", "Bílina")

    # Same page again: no extraction needed, the records are confirmed with a new date.
    again = api.post("/sources/demosklad/pages").json()
    assert again["status"] == "unchanged" and again["pages"] == []
    assert "4 records confirmed" in again["detail"]
    sources = {row["source"]["id"]: row for row in api.get("/sources").json()}
    assert sources["demosklad"]["last_snapshot"]["changed"] is False


def test_invented_or_inconsistent_rows_are_rejected(api):
    page_id = api.post("/sources/demosklad/pages").json()["pages"][0]["page_id"]
    rows = [
        row("Hnědé uhlí Bílina Ořech 1", "650 Kč/q", "q", "brown_coal"),  # not on the page
        row("Hnědé uhlí Bílina Ořech 2", "690 Kč/q", "t", "brown_coal"),  # wrong unit
        row("Kovářské uhlí pytel 25 kg", "480 Kč", "bag", "black_coal"),  # no package_text
    ]
    result = submit(api, page_id, rows, dry_run=True).json()
    assert (result["accepted"], result["rejected"]) == (0, 3)
    reasons = [v["reasons"] for v in result["verdicts"]]
    assert "is not on the page" in reasons[0][0]
    assert "contradicts the quoted unit 'q'" in reasons[1][0]
    assert "needs package_text" in reasons[2][0]

    stored = submit(api, page_id, rows).json()
    assert stored["status"] == "rejected"  # nothing verified: nothing replaces older data
    assert api.post("/tools/eshop_catalog", json={"fuel_type": "brown_coal"}).status_code == 502


def test_extraction_needs_a_fetched_page(api):
    response = submit(api, "0" * 64, ROWS)
    assert response.status_code == 422
    assert submit(api, "../../secrets", ROWS).status_code == 422


def test_robots_and_refusals_are_respected(api, yard):
    yard.pages[f"{ORIGIN}/robots.txt"] = (200, b"User-agent: *\nDisallow: /cenik/\n")
    blocked = api.post("/sources/demosklad/pages").json()
    assert blocked["status"] == "blocked_by_robots"
    assert yard.requested == [f"{ORIGIN}/robots.txt"]

    yard.pages[f"{ORIGIN}/robots.txt"] = (404, b"")
    yard.pages[f"{ORIGIN}/cenik/"] = (403, b"Forbidden")
    refused = api.post("/sources/demosklad/pages").json()
    assert (refused["status"], refused["http_status"]) == ("error", 403)


def test_price_lists_are_not_read_by_the_plain_collector(yard):
    (result,) = collect_all(fetch=yard)
    assert result.status == "needs_extraction"
    assert yard.requested == []


def test_step_endpoints_reject_unknown_sources(api):
    assert api.post("/sources/nope/pages").status_code == 404
    assert api.post("/sources/nope/collect").status_code == 404
