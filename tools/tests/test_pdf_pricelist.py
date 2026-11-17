"""PDF price lists reached through a link on a page. The PDF is built by hand (one page,
standard font, ASCII text) for a fictional coal yard; no network."""

import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import create_app
from podpalto_tools.collect.collector import FetchResponse
from podpalto_tools.collect.pricelist import document_to_text, find_document_link

ORIGIN = "https://demopdf.example"
REGISTRY = f"""
sources:
  - id: demopdf
    seller: DemoPdf
    base_url: {ORIGIN}
    kind: static_html
    pillar: 2
    page_paths: [/paliva]
    document_link: cenik-uhli.*\\.pdf
"""
LINES = [
    "Ceny uhli platne od 19.10.2026",
    "Kostka                              7 100,-Kc/t",
    "Orech 1                             7 200,-Kc/t",
    "Ceny jsou uvedeny vcetne 21% DPH.",
]


def make_pdf(lines: list[str]) -> bytes:
    """A minimal valid PDF with one page of text lines."""
    text = "BT /F1 11 Tf 50 750 Td 14 TL " + " ".join(f"({line}) Tj T*" for line in lines) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
        f"<< /Length {len(text)} >>\nstream\n{text}\nendstream",
    ]
    out, offsets = "%PDF-1.4\n", []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n{body}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    out += "".join(f"{offset:010d} 00000 n \n" for offset in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")


PAGE = (
    '<html><body><h1>Paliva</h1><a href="../_dokumenty/42/cena-dopravy.pdf">Doprava</a>'
    '<a href="../_dokumenty/42/cenik-uhli-19.10.2026.pdf">Stáhnout</a></body></html>'
).encode()
PDF_URL = f"{ORIGIN}/_dokumenty/42/cenik-uhli-19.10.2026.pdf"


class Site:
    def __init__(self):
        self.pages = {
            f"{ORIGIN}/robots.txt": (404, b""),
            f"{ORIGIN}/paliva": (200, PAGE),
            PDF_URL: (200, make_pdf(LINES)),
        }
        self.requested: list[str] = []

    def __call__(self, url):
        self.requested.append(url)
        status, body = self.pages.get(url, (404, b""))
        return FetchResponse(status, body)


@pytest.fixture
def site(data_dir):
    (data_dir.parent / "sources.yaml").write_text(REGISTRY, encoding="utf-8")
    return Site()


def test_pdf_text_keeps_rows_and_marks_columns():
    text = document_to_text(make_pdf(LINES))
    assert "Kostka | 7 100,-Kc/t" in text.splitlines()


def test_document_link_is_resolved_against_the_page():
    assert find_document_link(PAGE.decode(), f"{ORIGIN}/paliva", r"cenik-uhli.*\.pdf") == PDF_URL
    assert find_document_link(PAGE.decode(), f"{ORIGIN}/paliva", r"neni-tam") is None


def test_price_list_pdf_through_the_api(site):
    api = TestClient(create_app(fetch=site, sleep=lambda s: None))
    pages = api.post("/sources/demopdf/pages").json()
    assert pages["status"] == "ok"
    (page,) = pages["pages"]
    assert page["url"] == PDF_URL  # the record points at the PDF, not the page
    rows = [{"product_name": "Kostka", "price_text": "7 100,-Kc/t", "original_unit": "t",
             "fuel_category": "brown_coal", "price_includes_vat": True}]  # fmt: skip
    body = {"pages": [{"page_id": page["page_id"],
                       "extraction": {"price_list_found": True, "rows": rows}}]}  # fmt: skip
    stored = api.post("/sources/demopdf/extraction", json=body).json()
    assert stored["accepted"] == 1
    assert stored["verdicts"][0]["record"]["normalized_price_per_ton_vat"] == 7100


def test_missing_link_and_robots_are_reported(site):
    api = TestClient(create_app(fetch=site, sleep=lambda s: None))
    site.pages[f"{ORIGIN}/paliva"] = (200, b"<html><body>Bez ceniku</body></html>")
    missing = api.post("/sources/demopdf/pages").json()
    assert missing["status"] == "error" and "no link matching" in missing["detail"]

    site.pages[f"{ORIGIN}/paliva"] = (200, PAGE)
    site.pages[f"{ORIGIN}/robots.txt"] = (200, b"User-agent: *\nDisallow: /_dokumenty/\n")
    blocked = api.post("/sources/demopdf/pages").json()
    assert blocked["status"] == "blocked_by_robots"
    assert PDF_URL not in site.requested


def test_broken_pdf_is_an_error_not_a_crash(site):
    api = TestClient(create_app(fetch=site, sleep=lambda s: None))
    site.pages[PDF_URL] = (200, b"%PDF-1.4 this is not really a pdf")
    broken = api.post("/sources/demopdf/pages").json()
    assert broken["status"] == "error"
