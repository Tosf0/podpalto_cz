"""Parser of the Heureka XML product feed (``<SHOP><SHOPITEM>...``).

Shoptet shops publish it at ``/heureka/export/products.xml``. Only the tags that
were reliably filled in the feeds we inspected are read.

``FeedItem`` is also the common raw record of the other collectors (see ``shoptet.py``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from xml.etree.ElementTree import Element, ParseError

from defusedxml import ElementTree  # the feed is untrusted input
from defusedxml.common import DefusedXmlException


class FeedError(Exception):
    """The content is not a usable Heureka feed."""


@dataclass(frozen=True)
class FeedItem:
    item_id: str
    name: str
    url: str
    price_vat_czk: float
    group_id: str | None = None
    category: str = ""
    delivery_days: int | None = None
    """DELIVERY_DATE: 0 = in stock, N = ships in N days, None = not stated."""
    in_stock: bool | None = None
    """None = the seller does not say."""
    delivery_fee_czk: float | None = None
    """Lowest DELIVERY_PRICE. Shops often put a placeholder here (0 or 1)."""
    params: dict[str, str] = field(default_factory=dict)
    shipping_weight_kg: float | None = None
    """Weight the shop uses for shipping. A fallback for the package size only."""


def _text(item: Element, tag: str) -> str:
    return (item.findtext(tag) or "").strip()


def _number(raw: str) -> float | None:
    cleaned = raw.replace(" ", "").replace(" ", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_item(item: Element) -> FeedItem | None:
    name = _text(item, "PRODUCTNAME") or _text(item, "PRODUCT")
    price = _number(_text(item, "PRICE_VAT"))
    item_id = _text(item, "ITEM_ID")
    if not name or not item_id or price is None or price <= 0:
        return None

    days = _number(_text(item, "DELIVERY_DATE"))
    fees = [
        fee
        for delivery in item.findall("DELIVERY")
        if (fee := _number(_text(delivery, "DELIVERY_PRICE"))) is not None
    ]
    params = {
        key: _text(param, "VAL")
        for param in item.findall("PARAM")
        if (key := _text(param, "PARAM_NAME"))
    }
    return FeedItem(
        item_id=item_id,
        name=" ".join(name.split()),
        url=_text(item, "URL"),
        price_vat_czk=price,
        group_id=_text(item, "ITEMGROUP_ID") or None,
        category=_text(item, "CATEGORYTEXT"),
        delivery_days=int(days) if days is not None and days >= 0 else None,
        in_stock=days == 0 if days is not None and days >= 0 else None,
        delivery_fee_czk=min(fees) if fees else None,
        params=params,
    )


def parse_feed(content: bytes) -> tuple[list[FeedItem], int]:
    """Return the usable items and the number of items skipped as incomplete."""
    try:
        root = ElementTree.fromstring(content)
    except (ParseError, DefusedXmlException, ValueError) as exc:
        raise FeedError(f"not valid XML: {exc}") from exc
    if root.tag != "SHOP":
        raise FeedError(f"unexpected root element <{root.tag}>, expected <SHOP>")

    items: list[FeedItem] = []
    skipped = 0
    for element in root.findall("SHOPITEM"):
        parsed = _parse_item(element)
        if parsed is None:
            skipped += 1
        else:
            items.append(parsed)
    return items, skipped
