"""Shops without a feed: sitemap -> product pages -> microdata. Synthetic pages, no network."""

import gzip
import json

import pytest
from podpalto_tools.collect import Store, collect_all
from podpalto_tools.collect.collector import FetchResponse
from podpalto_tools.collect.heureka import FeedError
from podpalto_tools.collect.shoptet import parse_product_page, parse_sitemap, product_candidates
from podpalto_tools.schemas import FuelType
from podpalto_tools.settings import get_settings

ORIGIN = "https://demodrevo.example"
REGISTRY = f"""
sources:
  - id: demodrevo
    seller: DemoDrevo
    base_url: {ORIGIN}
    kind: shoptet_html
"""
ROBOTS = b"User-agent: *\nDisallow: /export/\nDisallow: /tajne-pelety/\n"
SITEMAP_INDEX = f"""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>{ORIGIN}/sitemaps/sitemap0.xml.gz</loc></sitemap>
</sitemapindex>""".encode()
SITEMAP = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>{ORIGIN}/</loc></url>
  <url><loc>{ORIGIN}/brikety/</loc></url>
  <url><loc>{ORIGIN}/brikety-ruf-paleta/</loc>
       <image:image><image:loc>https://cdn.example/ruf.jpg</image:loc></image:image></url>
  <url><loc>{ORIGIN}/dubove-drevo-8-m3/</loc></url>
  <url><loc>{ORIGIN}/prkno-smrk/</loc></url>
  <url><loc>{ORIGIN}/tajne-pelety/</loc></url>
  <url><loc>{ORIGIN}/blog/jak-topit/</loc></url>
  <url><loc>https://jiny-web.example/pelety/</loc></url>
</urlset>""".encode()


def product_page(
    name: str,
    category: str,
    product_id: str,
    offers: list[tuple[str | None, str, str]],
    *,
    product_sku: str | None = None,
    rows: dict[str, str] | None = None,
    codes: list[dict] | None = None,
    variants: dict[str, str] | None = None,
) -> bytes:
    """A page shaped like Shoptet's product detail. offers = (sku, price, availability)."""
    shipping = (
        '<span id="microdata-shipping-details-0" itemprop="shippingDetails" itemscope '
        'itemtype="https://schema.org/OfferShippingDetails">'
        '<meta itemprop="shippingLabel" content="Naše doprava" />'
        '<span itemprop="shippingRate" itemscope itemtype="https://schema.org/MonetaryAmount">'
        '<meta itemprop="value" content="600.00" /><meta itemprop="currency" content="CZK" />'
        "</span></span>"
        '<span id="microdata-shipping-details-1" itemprop="shippingDetails" itemscope '
        'itemtype="https://schema.org/OfferShippingDetails">'
        '<span itemprop="shippingRate" itemscope itemtype="https://schema.org/MonetaryAmount">'
        '<meta itemprop="value" content="0.00" /></span></span>'
    )
    offer_html = ""
    for index, (sku, price, availability) in enumerate(offers):
        offer_html += (
            '<span itemprop="offers" itemscope itemtype="https://schema.org/Offer">'
            + (f'<meta itemprop="sku" content="{sku}" />' if sku else "")
            + f'<link itemprop="availability" href="https://schema.org/{availability}" />'
            f'<meta itemprop="price" content="{price}" />'
            '<meta itemprop="priceCurrency" content="CZK" />'
            + (shipping if index == 0 else "")
            + "</span>"
        )
    table = "".join(
        f"<tr><th><span class='tip'>?</span> <span>{key}</span>:</th><td>{value}</td></tr>"
        for key, value in (rows or {}).items()
    )
    tracking = json.dumps(
        {
            "products": {
                str(i): {"content_ids": [sku], "variant": label}
                for i, (sku, label) in enumerate((variants or {}).items())
            }
        }
    ).replace('"', "&quot;")
    data_layer = json.dumps({"id": 1, "codes": codes or [], "priceWithVat": 1})
    return f"""<!DOCTYPE html><html><head><title>{name}</title></head><body>
<div class="search" itemscope itemtype="https://schema.org/WebSite">
  <meta itemprop="url" content="{ORIGIN}"/></div>
<script>dataLayer.push({{'shoptet' : {{ "pageType": "productDetail", "product": {data_layer} }}}});
</script>
<div class="p-detail" itemscope itemtype="https://schema.org/Product">
  <meta itemprop="name" content="{name}" />
  <meta itemprop="category" content="Úvodní stránka &gt; {category} &gt; {name}" />
  <div class="p-detail-inner"><p>Popis bez uzavřeného odstavce
    <meta itemprop="productID" content="{product_id}" />
    {f'<meta itemprop="sku" content="{product_sku}" />' if product_sku else ""}
    {offer_html}
    <table class="detail-parameters"><tbody>{table}</tbody></table>
  </div>
</div>
<script id="trackingScript" data-products="{tracking}"></script>
</body></html>""".encode()


PAGES = {
    f"{ORIGIN}/robots.txt": (200, ROBOTS),
    f"{ORIGIN}/sitemap.xml": (200, SITEMAP_INDEX),
    f"{ORIGIN}/sitemaps/sitemap0.xml.gz": (200, gzip.compress(SITEMAP)),
    f"{ORIGIN}/brikety/": (200, b"<html><body><h1>Brikety</h1></body></html>"),
    f"{ORIGIN}/brikety-ruf-paleta/": (
        200,
        product_page(
            "Brikety RUF premium",
            "Brikety",
            "83",
            [(None, "9024.00", "OutOfStock")],
            product_sku="99990003",
            rows={"Výhřevnost": "19 MJ/kg"},
            codes=[{"code": 99990003, "weight": 960}],
        ),
    ),
    f"{ORIGIN}/dubove-drevo-8-m3/": (
        200,
        product_page(
            "Dubové palivové dřevo 8 m³ sypané",
            "Palivové dřevo &gt; Volně ložené",
            "621",
            [("621/25/PAL", "14400.00", "InStock"), ("621/40/PAL", "14000.00", "InStock")],
            codes=[
                {"code": "621/25/PAL", "weight": 3490, "stocks": [{"id": "ext", "quantity": "5"}]},
                {"code": "621/40/PAL", "weight": 3490},
            ],
            variants={"621/25/PAL": "Délka: 25cm", "621/40/PAL": "Délka: 40cm"},
        ),
    ),
    f"{ORIGIN}/prkno-smrk/": (
        200,
        product_page("Prkno smrk 24x100", "Stavební řezivo", "81", [("81", "98.90", "InStock")]),
    ),
}


class Shop:
    def __init__(self) -> None:
        self.pages = dict(PAGES)
        self.requested: list[str] = []

    def __call__(self, url: str) -> FetchResponse:
        self.requested.append(url)
        status, body = self.pages.get(url, (404, b""))
        return FetchResponse(status, body)


@pytest.fixture
def shop(data_dir):
    (data_dir.parent / "sources.yaml").write_text(REGISTRY, encoding="utf-8")
    return Shop()


def collect(shop, pauses=None):
    (result,) = collect_all(fetch=shop, sleep=([] if pauses is None else pauses).append)
    return result


# --- parsing -------------------------------------------------------------------------------


def test_sitemap_index_and_gzip_urlset():
    assert parse_sitemap(SITEMAP_INDEX) == ("index", [f"{ORIGIN}/sitemaps/sitemap0.xml.gz"])
    kind, locations = parse_sitemap(gzip.compress(SITEMAP))
    assert kind == "urlset"
    assert len(locations) == 8  # page URLs only, the <image:loc> is not one of them
    with pytest.raises(FeedError):
        parse_sitemap(b"<html>403</html>")


def test_product_candidates_keep_single_segment_pages_of_the_shop():
    _, locations = parse_sitemap(SITEMAP)
    assert product_candidates(locations, ORIGIN, None) == [
        f"{ORIGIN}/brikety/",
        f"{ORIGIN}/brikety-ruf-paleta/",
        f"{ORIGIN}/dubove-drevo-8-m3/",
        f"{ORIGIN}/prkno-smrk/",
        f"{ORIGIN}/tajne-pelety/",
    ]
    assert product_candidates(locations, ORIGIN, "briket|drev") == [
        f"{ORIGIN}/brikety/",
        f"{ORIGIN}/brikety-ruf-paleta/",
        f"{ORIGIN}/dubove-drevo-8-m3/",
    ]


def test_product_page_without_variants():
    url = f"{ORIGIN}/brikety-ruf-paleta/"
    (item,) = parse_product_page(PAGES[url][1].decode(), url)
    assert (item.item_id, item.group_id, item.name) == ("99990003", "83", "Brikety RUF premium")
    assert (item.price_vat_czk, item.in_stock, item.category) == (9024.0, False, "Brikety")
    assert item.delivery_fee_czk == 0.0  # lowest of the delivery options
    assert item.shipping_weight_kg == 960
    assert item.params == {"Výhřevnost": "19 MJ/kg"}  # "? Výhřevnost:" cleaned up
    assert item.url == url


def test_product_page_with_variants():
    url = f"{ORIGIN}/dubove-drevo-8-m3/"
    items = parse_product_page(PAGES[url][1].decode(), url)
    assert [(i.item_id, i.name, i.price_vat_czk) for i in items] == [
        ("621/25/PAL", "Dubové palivové dřevo 8 m³ sypané Délka: 25cm", 14400.0),
        ("621/40/PAL", "Dubové palivové dřevo 8 m³ sypané Délka: 40cm", 14000.0),
    ]
    assert all(i.in_stock and i.group_id == "621" for i in items)
    assert items[0].category == "Palivové dřevo | Volně ložené"
    # Delivery options are listed once, on the first offer, and apply to all variants.
    assert [i.delivery_fee_czk for i in items] == [0.0, 0.0]


@pytest.mark.parametrize(
    "html",
    [
        "<html><body><h1>Kategorie</h1></body></html>",
        '<div itemscope itemtype="https://schema.org/Product"><meta itemprop="name" content="X">',
        "<<<not html at all",
        "",
    ],
)
def test_pages_without_a_priced_product_yield_nothing(html):
    assert parse_product_page(html, f"{ORIGIN}/x/") == []


# --- collection ----------------------------------------------------------------------------


def test_collect_reads_allowed_product_pages(shop, data_dir):
    pauses: list[float] = []
    result = collect(shop, pauses)
    assert (result.status, result.items, result.offers, result.changed) == ("ok", 4, 3, True)
    assert result.detail == "4 pages fetched, 3 with a product, 1 disallowed by robots.txt"
    assert shop.requested == [
        f"{ORIGIN}/robots.txt",
        f"{ORIGIN}/sitemap.xml",
        f"{ORIGIN}/sitemaps/sitemap0.xml.gz",
        f"{ORIGIN}/brikety/",
        f"{ORIGIN}/brikety-ruf-paleta/",
        f"{ORIGIN}/dubove-drevo-8-m3/",
        f"{ORIGIN}/prkno-smrk/",
    ]  # not /tajne-pelety/ (robots), not the blog, not the other host
    assert pauses == [1.5] * 5  # before the child sitemap and before every page

    store = Store(get_settings().db_path)
    (briquettes,) = store.latest_records(["demodrevo"], FuelType.WOOD_BRIQUETTES)
    assert (briquettes.package_weight_kg, briquettes.normalized_price_per_ton_vat) == (960, 9400)
    assert (briquettes.calorific_value_mj_kg, briquettes.calorific_source) == (19.0, "seller")
    assert briquettes.in_stock is False
    assert briquettes.flags == ["package_size_from_shipping_weight"]
    firewood = store.latest_records(["demodrevo"], FuelType.FIREWOOD)
    # 8 m3 loose; the 3490 kg shipping weight is not used for firewood.
    assert [
        (o.original_quantity, o.original_unit, o.normalized_price_per_prms_vat) for o in firewood
    ] == [(8, "prms", 1800), (8, "prms", 1750)]

    raw = json.loads((data_dir / store.last_snapshot("demodrevo").raw_path).read_text("utf-8"))
    assert [record["item_id"] for record in raw] == ["99990003", "621/25/PAL", "621/40/PAL", "81"]


def test_unchanged_pages_are_detected(shop, data_dir):
    collect(shop)
    second = collect(shop)
    assert (second.status, second.changed) == ("ok", False)
    assert len(list((data_dir / "raw" / "demodrevo").iterdir())) == 1


def test_refusal_on_a_page_stops_the_run_and_keeps_the_old_snapshot(shop):
    collect(shop)
    shop.requested.clear()
    shop.pages[f"{ORIGIN}/brikety-ruf-paleta/"] = (403, b"Forbidden")
    result = collect(shop)
    assert (result.status, result.http_status) == ("error", 403)
    assert f"{ORIGIN}/dubove-drevo-8-m3/" not in shop.requested  # stopped right there
    assert len(Store(get_settings().db_path).latest_records(["demodrevo"])) == 3


def test_a_few_missing_pages_are_tolerated_but_many_are_not(shop):
    extra = "".join(f"<url><loc>{ORIGIN}/pelety-{n}/</loc></url>" for n in range(6))
    sitemap = SITEMAP.replace(b"</urlset>", extra.encode() + b"</urlset>")
    shop.pages[f"{ORIGIN}/sitemaps/sitemap0.xml.gz"] = (200, sitemap)
    page = product_page("Pelety 15 kg", "Pelety", "7", [("7", "198.00", "InStock")])
    for n in range(6):
        shop.pages[f"{ORIGIN}/pelety-{n}/"] = (200, page)
    del shop.pages[f"{ORIGIN}/prkno-smrk/"]  # 1 of 10 pages answers 404
    result = collect(shop)
    assert result.status == "ok"
    assert result.detail == (
        "10 pages fetched, 8 with a product, 1 failed, 1 disallowed by robots.txt"
    )

    for n in range(3):
        del shop.pages[f"{ORIGIN}/pelety-{n}/"]  # now 4 of 10
    result = collect(shop)
    assert (result.status, result.detail) == ("error", "4 of 10 pages failed; snapshot discarded")


def test_page_limit_and_url_filter(shop, data_dir, monkeypatch):
    monkeypatch.setenv("COLLECT_MAX_PAGES", "2")
    result = collect(shop)
    assert result.detail.endswith("2 skipped by the 2-page limit")
    assert len([u for u in shop.requested if "sitemap" not in u and "robots" not in u]) == 2

    (data_dir.parent / "sources.yaml").write_text(
        REGISTRY + "    url_filter: drev\n    max_pages: 5\n", encoding="utf-8"
    )
    shop.requested.clear()
    result = collect(shop)
    assert shop.requested[3:] == [f"{ORIGIN}/dubove-drevo-8-m3/"]
    assert (result.items, result.offers) == (2, 2)


def test_robots_and_sitemap_failures(shop):
    shop.pages[f"{ORIGIN}/robots.txt"] = (200, b"User-agent: *\nDisallow: /\n")
    result = collect(shop)
    assert result.status == "blocked_by_robots"
    assert shop.requested == [f"{ORIGIN}/robots.txt"]

    shop.pages[f"{ORIGIN}/robots.txt"] = (200, ROBOTS + b"Crawl-delay: 4\n")
    shop.pages[f"{ORIGIN}/sitemap.xml"] = (403, b"")
    result = collect(shop)
    assert (result.status, result.detail) == ("error", "sitemap returned HTTP 403")


def test_crawl_delay_from_robots_is_honoured(shop):
    shop.pages[f"{ORIGIN}/robots.txt"] = (200, ROBOTS + b"Crawl-delay: 4\n")
    pauses: list[float] = []
    assert collect(shop, pauses).status == "ok"
    assert set(pauses) == {4.0}
