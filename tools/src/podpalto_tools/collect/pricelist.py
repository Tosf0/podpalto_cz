"""Price-list pages (``static_html`` sources): page text for the extraction crew and the
deterministic check of what the crew sends back.

The crew (app service) reads the page text and returns rows that *quote* the page: the
product name, the price text, the unit and the package exactly as written. It also makes
the judgements a parser cannot (fuel category, which unit the price refers to, whether
VAT is included). It never produces a number.

This module then:

1. checks that every quote really is on the page (no invented rows),
2. reads the price from the quoted text and checks the unit against the quote,
3. hands the row to ``normalize`` for all arithmetic.

The same check runs as the crew's guardrail (dry run), so the crew gets the reasons and
can correct its rows before anything is stored.
"""

from __future__ import annotations

import io
import re
from html import unescape
from html.parser import HTMLParser
from typing import Literal
from urllib.parse import urljoin, urlsplit

from pydantic import BaseModel, Field
from pypdf import PdfReader

from podpalto_tools.collect.normalize import (
    OriginalUnit,
    RawPrice,
    SolidFuelPriceRecord,
    fold,
    normalize_extracted,
    weights_in,
)
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.collect.worddoc import doc_to_text, docx_to_text, is_doc, is_docx
from podpalto_tools.schemas import FuelType

MAX_PAGE_CHARS = 40_000

# --- page text ---------------------------------------------------------------------------

_SKIP = {"script", "style", "noscript", "svg", "head", "template", "iframe"}
_BLOCK = {"p", "div", "li", "br", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article",
          "header", "footer", "ul", "ol", "table", "dt", "dd"}  # fmt: skip


class _PageText(HTMLParser):
    """Visible text; table rows become one line with cells separated by ' | '."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lines: list[str] = []
        self._line: list[str] = []
        self._skip = 0

    def _flush(self) -> None:
        line = " ".join(" ".join(self._line).split())
        if line.strip(" |"):
            self.lines.append(line.strip(" |").strip())
        self._line = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _SKIP:
            self._skip += 1
        elif tag in ("td", "th") and self._line:
            self._line.append("|")
        elif tag == "tr" or tag in _BLOCK:
            self._flush()

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP and self._skip:
            self._skip -= 1
        elif tag == "tr" or tag in _BLOCK:
            self._flush()

    def handle_data(self, data: str) -> None:
        if not self._skip and data.strip():
            self._line.append(data.strip())


def page_to_text(html: str) -> str:
    parser = _PageText()
    parser.feed(html)
    parser.close()
    parser._flush()
    return "\n".join(parser.lines)


_COLUMN_GAP = re.compile(r" {3,}")


def pdf_to_text(content: bytes) -> str:
    """Text of a PDF price list, line by line. Wide gaps between words become ' | ', so
    a PDF table reads like an HTML one."""
    reader = PdfReader(io.BytesIO(content))
    lines = []
    for page in reader.pages:
        for line in page.extract_text(extraction_mode="layout").splitlines():
            line = _COLUMN_GAP.sub(" | ", line.strip())
            if line.strip(" |-"):
                lines.append(line)
    return "\n".join(lines)


def document_to_text(content: bytes) -> str:
    """Visible text of a downloaded price list: PDF, Word (.doc, .docx) or HTML, recognised
    by the file's content, not its name. Raises ``WordError`` for a broken Word file."""
    if content.lstrip()[:5] == b"%PDF-":
        return pdf_to_text(content)
    if is_doc(content):
        return doc_to_text(content)
    if is_docx(content):
        return docx_to_text(content)
    return page_to_text(content.decode("utf-8", errors="replace"))


_LINK = re.compile(r"""<(?:a|img)\b[^>]*\b(?:href|src)\s*=\s*["']([^"']+)["']""", re.I)


def find_document_links(html: str, base_url: str, pattern: str) -> list[str]:
    """Absolute URLs of links and images on the page that match ``pattern``, in page order."""
    found: list[str] = []
    for href in _LINK.findall(html):
        url = urljoin(base_url, unescape(href))
        if re.search(pattern, url, re.I) and url not in found:
            found.append(url)
    return found


def find_document_link(html: str, base_url: str, pattern: str) -> str | None:
    """First matching link (e.g. the current PDF price list, whose file name changes)."""
    links = find_document_links(html, base_url, pattern)
    return links[0] if links else None


_SPACES = re.compile(r"[\s   |]+")
_DASHES = str.maketrans({"–": "-", "—": "-", "‐": "-", "″": '"', "“": '"', "”": '"', "„": '"'})


def _canon(text: str) -> str:
    """Comparison form: case, spacing, dashes and table separators do not matter."""
    return _SPACES.sub(" ", text.translate(_DASHES)).strip().casefold()


def quote_found(quote: str, page_text: str) -> bool:
    canon = _canon(quote)
    return bool(canon) and canon in _canon(page_text)


# --- numbers in quoted text --------------------------------------------------------------

# "6 900,50", "6.900", "690,-", "1 270,50 Kč"
_PRICE_NUMBER = re.compile(r"(?<![\d,.])\d{1,3}(?:[  .]\d{3})+(?:,\d+)?(?![\d])|\d+(?:,\d+)?")
# Quantities that are not the price: "100 kg", "25 cm", "21 %", "20 % DPH".
_NOT_PRICE = re.compile(
    r"\d+(?:[.,]\d+)?\s*(?:kg|g|cm|mm|m3|m³|m\b|%|mj|kwh|l\b|ks|x\b|q\b|t\b|prms|prmr|prm)",
    re.I,
)


def parse_price(text: str) -> float | None:
    """The single price in a quoted text, or None when there is none or more than one."""
    cleaned = _NOT_PRICE.sub(" ", text)
    numbers = _PRICE_NUMBER.findall(cleaned)
    if len(numbers) != 1:
        return None
    number = numbers[0].replace(" ", "").replace(" ", "")
    if "," in number:
        number = number.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(?:\.\d{3})+", number):
        number = number.replace(".", "")
    value = float(number)
    return value if value > 0 else None


_UNIT_RULES: list[tuple[OriginalUnit, re.Pattern[str]]] = [
    ("q", re.compile(r"/\s*q\b|\bza\s*(?:1\s*)?q\b|metrak|/\s*100\s*kg|\bkc\s*/\s*q")),
    ("t", re.compile(r"/\s*t\b|\bza\s*(?:1\s*)?t\b|/\s*tun|\bza\s*tunu|\bkc\s*/\s*t\b")),
    ("kg", re.compile(r"/\s*kg\b|\bza\s*(?:1\s*)?kg\b")),
    ("prms", re.compile(r"prms|sprm|sypan")),
    ("prmr", re.compile(r"prmr|\bprm\b|rovnan")),
    ("m3", re.compile(r"m3|m³|plnometr|plnem")),
]


def unit_in(text: str) -> OriginalUnit | None:
    """The unit a quoted text names, when it names exactly one."""
    folded = fold(text)
    units = {unit for unit, pattern in _UNIT_RULES if pattern.search(folded)}
    return units.pop() if len(units) == 1 else None


# --- the crew's output and its check ------------------------------------------------------


class ExtractedPriceRow(BaseModel):
    """One row of a price list as the extraction crew reports it (quotes + judgements).

    Must match ``ExtractedPriceRow`` of the app service (the services share no code).
    """

    product_name: str = Field(..., description="Product name, copied exactly from the page")
    variant_text: str | None = Field(
        None,
        description="What tells this price apart from other prices of the same product "
        "(log length, quantity tier, price zone, packaging), copied exactly",
    )
    price_text: str = Field(
        ..., description="The text holding ONE price, copied exactly, e.g. '690 Kč/q'"
    )
    unit_text: str | None = Field(
        None, description="Text naming the unit if it is not in price_text, copied exactly"
    )
    package_text: str | None = Field(
        None, description="bag/pallet only: text stating its weight, copied exactly"
    )
    original_unit: OriginalUnit = Field(..., description="What one price buys")
    fuel_category: FuelType
    price_includes_vat: bool | None = Field(None, description="None when the page does not say")
    quality_standard: str | None = Field(None, description="Grade or certificate, copied exactly")
    delivery_note: str | None = Field(None, description="Delivery terms, copied exactly")
    qa_status: Literal["accepted", "rejected"] = "accepted"
    qa_note: str = ""


class SellerPriceExtractionList(BaseModel):
    """Output of the extraction crew for one page (PDF, section 4.3)."""

    price_list_found: bool = Field(..., description="False when the page has no price list")
    rows: list[ExtractedPriceRow] = Field(default_factory=list)
    notes: str = ""


class RowVerdict(BaseModel):
    index: int
    product_name: str
    accepted: bool
    reasons: list[str] = Field(default_factory=list)
    record: SolidFuelPriceRecord | None = None


def _quotes(row: ExtractedPriceRow) -> dict[str, str]:
    fields = {"product_name": row.product_name, "price_text": row.price_text}
    for name in ("variant_text", "unit_text", "package_text", "quality_standard", "delivery_note"):
        if value := getattr(row, name):
            fields[name] = value
    return fields


def row_item_id(page_url: str, name: str, unit: str | None) -> str:
    """Stable id of a price-list row: page path + slug of the name, variant and unit.

    'https://x.cz/cenik/', 'Buk – prms', 'prms' -> '/cenik/#buk-prms-prms'. Not the row's
    position: a row added by the seller would shift every later price to another product
    (spec section 4). The page path, not the full URL, survives a move to https or www.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", fold(f"{name} {unit or ''}")).strip("-")
    return f"{urlsplit(page_url).path or '/'}#{slug}"


def unique_item_ids(verdicts: list[RowVerdict]) -> None:
    """Rows with the same name and unit on one page get -2, -3 ... in page order.

    Call it after ``drop_duplicates``, so a dropped repeat does not shift the numbers.
    """
    seen: dict[str, int] = {}
    for verdict in verdicts:
        if not verdict.accepted or verdict.record is None:
            continue
        item_id = verdict.record.item_id
        seen[item_id] = seen.get(item_id, 0) + 1
        if seen[item_id] > 1:
            verdict.record.item_id = f"{item_id}-{seen[item_id]}"


def verify_row(
    index: int,
    row: ExtractedPriceRow,
    page_text: str,
    page_url: str,
    source: Source,
    scraped_at: str | None,
) -> RowVerdict:
    """Accept a row only when its quotes are on the page and its numbers can be read."""
    reasons = [
        f"{name} {value!r} is not on the page; copy the text exactly"
        for name, value in _quotes(row).items()
        if not quote_found(value, page_text)
    ]
    price = parse_price(row.price_text)
    if price is None:
        reasons.append(f"price_text {row.price_text!r} must hold exactly one price")

    stated_unit = unit_in(" ".join(filter(None, [row.price_text, row.unit_text])))
    if stated_unit and stated_unit != row.original_unit and row.original_unit not in (
        "bag", "pallet"
    ):  # fmt: skip
        reasons.append(
            f"original_unit {row.original_unit!r} contradicts the quoted unit {stated_unit!r}"
        )
    weight = None
    if row.original_unit in ("bag", "pallet"):
        weights = weights_in(row.package_text or "")
        if not weights:
            reasons.append("bag/pallet needs package_text that states the weight in kg")
        else:
            weight = max(weights)

    verdict = RowVerdict(
        index=index, product_name=row.product_name, accepted=not reasons, reasons=reasons
    )
    if reasons:
        return verdict

    flags = [] if stated_unit else ["unit_judged_by_extractor"]
    if source.price_from or re.search(r"\bod\b", fold(row.price_text)):
        flags.append("price_from")  # "Cena od 12,20 Kč/kg": the cheapest variant or region
    includes_vat = row.price_includes_vat
    if includes_vat is None:
        includes_vat = source.price_includes_vat
        flags.append("vat_assumed_from_registry")
    # A bullet before the variant ("- sypané 25 cm" in a Word cell) is not part of its name.
    variant = (row.variant_text or "").lstrip("-–—•· ").strip()
    name = f"{row.product_name} – {variant}" if variant else row.product_name
    raw = RawPrice(
        fuel=row.fuel_category,
        name=name,
        price=price,
        unit=row.original_unit,
        package_weight_kg=weight,
        price_includes_vat=includes_vat,
        m3_is_solid=row.original_unit == "m3",  # on price lists 'm3' is the solid metre
        flags=flags,
    )
    verdict.record = normalize_extracted(
        raw,
        source,
        item_id=row_item_id(page_url, name, row.original_unit),
        # Variants of one product (lengths, quantity tiers, price zones) share the group,
        # so the comparison counts the product once, at its cheapest variant.
        group_id=f"{page_url}#{fold(' '.join(row.product_name.split()))}",
        url=page_url,
        scraped_at=scraped_at,
        quality=row.quality_standard,
        delivery_note=row.delivery_note,
        delivery_included=None,
    )
    return verdict


def verify_rows(
    extraction: SellerPriceExtractionList,
    page_text: str,
    page_url: str,
    source: Source,
    scraped_at: str | None = None,
    extra_flags: tuple[str, ...] = (),
) -> list[RowVerdict]:
    """Verdicts for the rows the QA auditor accepted; rows it rejected are not checked."""
    verdicts = [
        verify_row(index, row, page_text, page_url, source, scraped_at)
        for index, row in enumerate(extraction.rows)
        if row.qa_status == "accepted"
    ]
    for verdict in verdicts:
        if verdict.record is not None:
            verdict.record.flags.extend(extra_flags)
    return verdicts


def drop_duplicates(verdicts: list[RowVerdict]) -> int:
    """Reject accepted rows that repeat an earlier price: same product, unit and price incl.
    VAT. Pages often show one price twice (without and with VAT, or in a column that
    repeats another), which would count one offer twice. Returns how many were dropped."""
    seen: set[tuple] = set()
    dropped = 0
    for verdict in verdicts:
        record = verdict.record
        if not verdict.accepted or record is None:
            continue
        key = (
            record.fuel_category, fold(record.product_name_raw), record.original_unit,
            record.original_quantity, record.package_weight_kg, round(record.original_price_vat),
        )  # fmt: skip
        if key in seen:
            verdict.accepted, verdict.record = False, None
            verdict.reasons.append("duplicate of an earlier row (same product, unit and price)")
            dropped += 1
        seen.add(key)
    return dropped
