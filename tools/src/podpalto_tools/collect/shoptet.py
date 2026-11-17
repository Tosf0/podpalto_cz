"""Reads Shoptet shops that publish no feed: sitemap -> product pages -> schema.org microdata.

Shoptet renders product pages on the server and marks them up the same way in every
template we inspected::

    <div itemscope itemtype="https://schema.org/Product">
      <meta itemprop="name" ...> <meta itemprop="category" ...> <meta itemprop="productID" ...>
      <span itemprop="offers" itemscope itemtype="https://schema.org/Offer">   (one per variant)
        <meta itemprop="sku" ...> <link itemprop="availability" ...> <meta itemprop="price" ...>

So a plain HTTP GET and an HTML parser are enough; no browser, no JavaScript.
The sitemap is the list of pages the shop itself offers to crawlers.
"""

from __future__ import annotations

import gzip
import json
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from urllib.parse import urlparse
from xml.etree.ElementTree import ParseError

from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException

from podpalto_tools.collect.heureka import FeedError, FeedItem

_VOID_TAGS = frozenset(
    "area base br col embed hr img input link meta param source track wbr".split()
)
_OUT_OF_STOCK = ("OutOfStock", "SoldOut", "Discontinued")
_CODES = re.compile(r'"codes"\s*:\s*(?=\[)')


# --- sitemap -----------------------------------------------------------------------------


def _split(tag: str) -> tuple[str, str]:
    """'{namespace}local' -> (namespace, local)."""
    namespace, _, local = tag.rpartition("}")
    return namespace, local


def parse_sitemap(content: bytes) -> tuple[str, list[str]]:
    """Return ('index' | 'urlset', locations). Accepts gzip-compressed sitemaps."""
    if content[:2] == b"\x1f\x8b":
        try:
            content = gzip.decompress(content)
        except (OSError, EOFError) as exc:
            raise FeedError(f"sitemap is not valid gzip: {exc}") from exc
    try:
        root = ElementTree.fromstring(content)
    except (ParseError, DefusedXmlException, ValueError) as exc:
        raise FeedError(f"sitemap is not valid XML: {exc}") from exc
    namespace, kind = _split(root.tag)
    if kind not in {"sitemapindex", "urlset"}:
        raise FeedError(f"unexpected sitemap root <{kind}>")
    locations = [
        child.text.strip()
        for entry in root
        for child in entry
        # Same namespace only: <image:loc> is a picture, not a page.
        if _split(child.tag) == (namespace, "loc") and child.text
    ]
    return ("index" if kind == "sitemapindex" else "urlset"), locations


def product_candidates(locations: list[str], origin: str, url_filter: str | None) -> list[str]:
    """Sitemap URLs that can be product pages: same host, one path segment, optional filter.

    Shoptet products live at ``/slug/``. Categories do too, so the result still contains
    pages without a product; those are recognised after download by the missing microdata.
    """
    host = urlparse(origin).netloc
    pattern = re.compile(url_filter, re.I) if url_filter else None
    candidates: list[str] = []
    for location in locations:
        url = urlparse(location)
        segments = [segment for segment in url.path.split("/") if segment]
        if url.scheme not in {"http", "https"} or url.netloc != host or len(segments) != 1:
            continue
        if pattern and not pattern.search(url.path):
            continue
        if location not in candidates:
            candidates.append(location)
    return candidates


# --- product page ------------------------------------------------------------------------


@dataclass
class _Scope:
    """One microdata item (an element with ``itemscope``) and its properties."""

    tag: str
    prop: str | None
    itemtype: str
    props: dict[str, list] = field(default_factory=dict)
    nested: int = 0  # open same-name tags inside, to find the matching end tag

    def first(self, name: str) -> str | None:
        return next((v for v in self.props.get(name, []) if isinstance(v, str)), None)

    def scopes(self, name: str) -> list[_Scope]:
        return [v for v in self.props.get(name, []) if isinstance(v, _Scope)]


class _ProductPage(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[_Scope] = []
        self.products: list[_Scope] = []
        self.variants: dict[str, str] = {}
        self.params: dict[str, str] = {}
        self._in_table = False
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    # microdata

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "script" and attributes.get("id") == "trackingScript":
            self._read_variants(attributes.get("data-products"))
        self._table_start(tag, attributes)

        if "itemscope" in attributes and tag not in _VOID_TAGS:
            self.stack.append(
                _Scope(tag, attributes.get("itemprop"), attributes.get("itemtype") or "")
            )
            return
        if not self.stack:
            return
        top = self.stack[-1]
        prop = attributes.get("itemprop")
        if prop and tag in {"meta", "link"}:
            value = attributes.get("content") if tag == "meta" else attributes.get("href")
            if value is not None:
                top.props.setdefault(prop, []).append(value.strip())
        elif tag == top.tag:
            top.nested += 1

    def handle_endtag(self, tag: str) -> None:
        self._table_end(tag)
        if not self.stack or tag != self.stack[-1].tag:
            return
        if self.stack[-1].nested:
            self.stack[-1].nested -= 1
        else:
            self._close_scope()

    def _close_scope(self) -> None:
        scope = self.stack.pop()
        if scope.itemtype.endswith("schema.org/Product"):
            self.products.append(scope)
        if self.stack and scope.prop:
            self.stack[-1].props.setdefault(scope.prop, []).append(scope)

    def finish(self) -> None:
        self.close()
        while self.stack:  # unbalanced markup: keep what was read
            self._close_scope()

    # variant names: <script id="trackingScript" data-products='{"products": {...}}'>

    def _read_variants(self, raw: str | None) -> None:
        try:
            products = json.loads(raw or "")["products"]
        except (ValueError, KeyError, TypeError):
            return
        if not isinstance(products, dict):
            return
        for product in products.values():
            if not isinstance(product, dict):
                continue
            ids, variant = product.get("content_ids"), product.get("variant")
            if isinstance(ids, list) and ids and isinstance(variant, str) and variant:
                self.variants[str(ids[0])] = variant

    # parameter table: <table class="detail-parameters"><tr><th>Name</th><td>Value</td>

    def _table_start(self, tag: str, attributes: dict[str, str | None]) -> None:
        if tag == "table" and "detail-parameters" in (attributes.get("class") or ""):
            self._in_table = True
        elif self._in_table and tag == "tr":
            self._row = []
        elif self._row is not None and tag in {"th", "td"}:
            self._cell = []

    def _table_end(self, tag: str) -> None:
        if not self._in_table:
            return
        if tag in {"th", "td"} and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            # Names carry decoration: "? Výhřevnost :" (tooltip mark, colon).
            if len(self._row) >= 2 and (name := self._row[0].strip(" :?")) and self._row[1]:
                self.params[name] = self._row[1]
            self._row = None
        elif tag == "table":
            self._in_table = False

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


def _shipping_weights(html: str) -> dict[str, float]:
    """Variant code -> shipping weight in kg, from Shoptet's dataLayer (``"codes": [...]``)."""
    match = _CODES.search(html)
    if not match:
        return {}
    try:
        codes, _ = json.JSONDecoder().raw_decode(html, match.end())
    except ValueError:
        return {}
    weights: dict[str, float] = {}
    for entry in codes if isinstance(codes, list) else []:
        if not isinstance(entry, dict):
            continue
        weight = entry.get("weight")
        if isinstance(weight, (int, float)) and not isinstance(weight, bool) and weight > 0:
            weights[str(entry.get("code"))] = float(weight)
    return weights


def _number(raw: str | None) -> float | None:
    try:
        return float((raw or "").replace(",", "."))
    except ValueError:
        return None


def _shipping_rates(scope: _Scope) -> list[float]:
    rates = []
    for details in scope.scopes("shippingDetails"):
        for rate in details.scopes("shippingRate"):
            if (value := _number(rate.first("value"))) is not None:
                rates.append(value)
    return rates


def parse_product_page(html: str, url: str) -> list[FeedItem]:
    """Items of one product page, one per variant. Empty when the page is not a product."""
    page = _ProductPage()
    page.feed(html)
    page.finish()
    if not page.products:
        return []
    product = page.products[0]
    name = product.first("name")
    if not name:
        return []
    name = " ".join(name.split())
    product_id = product.first("productID") or urlparse(url).path.strip("/")
    # "Úvodní stránka > Brikety > Brikety RUF" -> "Brikety"
    path = [part.strip() for part in (product.first("category") or "").split(">")]
    category = " | ".join(part for part in path[1:-1] if part)

    offers = product.scopes("offers")
    weights = _shipping_weights(html)
    # Shoptet lists delivery options on the first offer and references them from the rest.
    rates = _shipping_rates(product) + [r for offer in offers for r in _shipping_rates(offer)]
    items: list[FeedItem] = []
    for index, offer in enumerate(offers, start=1):
        price = _number(offer.first("price"))
        if price is None or price <= 0 or (offer.first("priceCurrency") or "CZK") != "CZK":
            continue
        sku = offer.first("sku") or product.first("sku")
        item_id = sku or (product_id if len(offers) == 1 else f"{product_id}-{index}")
        availability = offer.first("availability") or ""
        in_stock = (
            True
            if availability.endswith("InStock")
            else False
            if availability.endswith(_OUT_OF_STOCK)
            else None
        )
        variant = page.variants.get(item_id)
        items.append(
            FeedItem(
                item_id=item_id,
                name=f"{name} {variant}" if variant else name,
                url=offer.first("url") or url,
                price_vat_czk=price,
                group_id=product_id,
                category=category,
                in_stock=in_stock,
                delivery_fee_czk=min(rates) if rates else None,
                params=dict(page.params),
                shipping_weight_kg=weights.get(item_id),
            )
        )
    return items
