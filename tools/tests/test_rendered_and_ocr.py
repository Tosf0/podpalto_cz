"""rendered_html (headless browser) and image_ocr (Tesseract) sources. The browser and
the OCR are replaced by fakes; the table-grid detection runs on a drawn image."""

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from podpalto_tools.api import create_app
from podpalto_tools.collect import Store, load_sources
from podpalto_tools.collect.collector import FetchResponse, fetch_price_pages
from podpalto_tools.collect.ocr import find_grid
from podpalto_tools.settings import get_settings

REGISTRY = """
sources:
  - id: demojs
    seller: DemoJs
    base_url: https://demojs.example
    kind: rendered_html
    pillar: 3
    page_paths: [/paliva]
  - id: demoimg
    seller: DemoImg
    base_url: https://demoimg.example
    kind: image_ocr
    pillar: 4
    page_paths: [/palivo]
    document_link: palivo/cenik_\\w+\\.png
"""
JS_PAGE = (
    b"<html><body><div>Pelety Premium A1 15 kg</div><div>184,-</div>"
    b"<div>(1 Kilogram = 12,27)</div></body></html>"
)
IMG_PAGE = (
    '<html><body><img src="/cache/cenik_small.png">'
    '<a href="/images/palivo/cenik_pisecna.png">ceník ke stažení</a></body></html>'
).encode()
OCR_TEXT = (
    "Dřevina | 50 cm | 25 cm\nJehličnaté | 1073 Kč | 1 249 Kč\n"
    "* Uvedené ceny za 1 prms jsou včetně DPH"
)


class Web:
    def __init__(self):
        self.pages = {
            "https://demojs.example/robots.txt": (404, b""),
            "https://demoimg.example/robots.txt": (404, b""),
            "https://demoimg.example/palivo": (200, IMG_PAGE),
            "https://demoimg.example/images/palivo/cenik_pisecna.png": (200, b"PNG-BYTES"),
        }
        self.requested: list[str] = []
        self.rendered: list[str] = []

    def __call__(self, url):
        self.requested.append(url)
        status, body = self.pages.get(url, (404, b""))
        return FetchResponse(status, body)

    def render(self, url):
        self.rendered.append(url)
        return FetchResponse(200, JS_PAGE) if url.endswith("/paliva") else FetchResponse(404, b"")


def fake_ocr(content: bytes) -> str:
    assert content == b"PNG-BYTES"
    return OCR_TEXT


@pytest.fixture
def web(data_dir):
    (data_dir.parent / "sources.yaml").write_text(REGISTRY, encoding="utf-8")
    return Web()


@pytest.fixture
def api(web):
    return TestClient(create_app(fetch=web, sleep=lambda s: None, render=web.render, ocr=fake_ocr))


def submit(api, source_id, page_id, rows):
    body = {"pages": [{"page_id": page_id,
                       "extraction": {"price_list_found": True, "rows": rows}}]}  # fmt: skip
    return api.post(f"/sources/{source_id}/extraction", json=body).json()


def test_rendered_page_goes_through_the_browser(api, web):
    (page,) = api.post("/sources/demojs/pages").json()["pages"]
    assert web.rendered == ["https://demojs.example/paliva"]
    assert "https://demojs.example/paliva" not in web.requested  # robots.txt only
    assert "184,-" in page["text"] and page["read_by"] == "text"
    rows = [{"product_name": "Pelety Premium A1 15 kg", "price_text": "184,-",
             "original_unit": "bag", "package_text": "15 kg", "fuel_category": "wood_pellets",
             "price_includes_vat": True}]  # fmt: skip
    stored = submit(api, "demojs", page["page_id"], rows)
    assert stored["verdicts"][0]["record"]["normalized_price_per_ton_vat"] == 12267


def test_images_are_read_by_ocr_and_flagged(api, web):
    (page,) = api.post("/sources/demoimg/pages").json()["pages"]
    # The full-size original linked from the page, not the small cached copy.
    assert page["url"] == "https://demoimg.example/images/palivo/cenik_pisecna.png"
    assert page["read_by"] == "ocr"
    rows = [{"product_name": "Jehličnaté", "variant_text": "50 cm", "price_text": "1073 Kč",
             "unit_text": "za 1 prms", "original_unit": "prms", "fuel_category": "firewood",
             "price_includes_vat": True}]  # fmt: skip
    stored = submit(api, "demoimg", page["page_id"], rows)
    record = stored["verdicts"][0]["record"]
    assert record["normalized_price_per_prms_vat"] == 1073
    assert "read_by_ocr" in record["flags"]


def test_missing_browser_or_images_are_errors(web, data_dir):
    settings = get_settings()
    sources = {source.id: source for source in load_sources()}
    result = fetch_price_pages(sources["demojs"], Store(settings.db_path), web, settings,
                               sleep=lambda s: None)  # fmt: skip
    assert (result.status, result.detail) == (
        "error",
        "no browser configured for rendered_html sources",
    )

    web.pages["https://demoimg.example/palivo"] = (200, b"<html>bez obrazku</html>")
    result = fetch_price_pages(sources["demoimg"], Store(settings.db_path), web, settings,
                               sleep=lambda s: None, ocr=fake_ocr)  # fmt: skip
    assert result.status == "error" and "no image matching" in result.detail


def test_registry_requires_the_image_pattern(data_dir):
    (data_dir.parent / "sources.yaml").write_text(
        "sources:\n  - id: x\n    seller: X\n    base_url: https://x.example\n"
        "    kind: image_ocr\n    page_paths: [/p]\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="needs document_link"):
        load_sources()


def test_table_grid_is_found_from_the_ruling_lines():
    image = Image.new("L", (400, 300), 230)  # light background, like a coloured poster
    draw = ImageDraw.Draw(image)
    for y in (50, 100, 150, 200):
        draw.line([(20, y), (380, y)], fill=20, width=3)
    for x in (20, 140, 260, 380):
        draw.line([(x, 50), (x, 200)], fill=20, width=3)
    draw.text((30, 60), "Jehlicnate", fill=0)  # text must not be taken for a line
    rows, columns = find_grid(image)
    assert rows == [50, 100, 150, 200]
    assert columns == [20, 140, 260, 380]
