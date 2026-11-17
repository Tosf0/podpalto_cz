"""Data collection: source registry -> feed, product pages or price lists -> price records
-> snapshot database.

Collection and every price calculation are deterministic code. Price-list pages are read
by the app's extraction crew, but only as verbatim quotes that this package verifies and
turns into numbers. The tools in ``podpalto_tools.sources`` only query what was
collected, so agents never fetch or compute prices themselves.
"""

from podpalto_tools.collect.collector import (
    CollectResult,
    ExtractionResult,
    PageExtraction,
    PagesResult,
    collect_all,
    fetch_price_pages,
    ingest_extraction,
)
from podpalto_tools.collect.normalize import SolidFuelPriceRecord
from podpalto_tools.collect.pricelist import ExtractedPriceRow, SellerPriceExtractionList
from podpalto_tools.collect.source_registry import Source, enabled_sources, load_sources
from podpalto_tools.collect.store import Snapshot, Store

__all__ = [
    "CollectResult",
    "ExtractedPriceRow",
    "ExtractionResult",
    "PageExtraction",
    "PagesResult",
    "SellerPriceExtractionList",
    "Snapshot",
    "SolidFuelPriceRecord",
    "Source",
    "Store",
    "collect_all",
    "enabled_sources",
    "fetch_price_pages",
    "ingest_extraction",
    "load_sources",
]
