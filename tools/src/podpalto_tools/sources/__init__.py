"""One module per data source. Register new sources in ``ALL_TOOLS``."""

from podpalto_tools.registry import ToolSpec
from podpalto_tools.sources import (
    customer_reviews,
    eshop_catalog,
    heating_demand,
    market_statistics,
    news_search,
    page_text,
    price_comparison,
)

ALL_TOOLS: list[ToolSpec] = [
    eshop_catalog.TOOL,
    price_comparison.TOOL,
    heating_demand.TOOL,
    market_statistics.TOOL,
    news_search.TOOL,
    customer_reviews.TOOL,
    page_text.TOOL,
]

__all__ = ["ALL_TOOLS"]
