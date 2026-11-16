"""MOCK source: price-comparison aggregator (market-wide price level per fuel type)."""

from __future__ import annotations

from statistics import mean

from pydantic import BaseModel, Field

from podpalto_tools.registry import ToolSpec
from podpalto_tools.schemas import FuelType, ToolResult
from podpalto_tools.sources.eshop_catalog import CATALOG


class Offer(BaseModel):
    seller: str
    product: str
    unit_price_czk: int
    in_stock: bool


class PriceComparisonInput(BaseModel):
    fuel_type: FuelType = Field(..., description="Fuel category to compare")
    product_query: str | None = Field(
        None, description="Optional keyword the product name must contain, e.g. 'beech' or 'RUF'"
    )


class PriceComparisonOutput(ToolResult):
    fuel_type: FuelType
    unit: str | None = Field(None, description="Unit of all prices: 't' or 'prms'")
    offers_count: int
    min_unit_price_czk: int | None = None
    avg_unit_price_czk: int | None = None
    max_unit_price_czk: int | None = None
    offers: list[Offer] = Field(default_factory=list, description="All offers, cheapest first")


def run(params: PriceComparisonInput) -> PriceComparisonOutput:
    query = (params.product_query or "").lower()
    matches = sorted(
        (p for p in CATALOG if p.fuel_type == params.fuel_type and query in p.name.lower()),
        key=lambda p: p.unit_price_czk,
    )
    result = PriceComparisonOutput(
        source="mock price-comparison aggregator",
        fuel_type=params.fuel_type,
        offers_count=len(matches),
    )
    if matches:
        prices = [p.unit_price_czk for p in matches]
        result.unit = matches[0].unit
        result.min_unit_price_czk = min(prices)
        result.avg_unit_price_czk = round(mean(prices))
        result.max_unit_price_czk = max(prices)
        result.offers = [
            Offer(
                seller=p.seller,
                product=p.name,
                unit_price_czk=p.unit_price_czk,
                in_stock=p.in_stock,
            )
            for p in matches
        ]
    return result


TOOL = ToolSpec(
    name="price_comparison",
    description=(
        "Aggregated price level for one fuel type across all sellers: min, average and max "
        "unit price plus the offers ranked from cheapest. Use it to position a price "
        "against the market."
    ),
    input_model=PriceComparisonInput,
    output_model=PriceComparisonOutput,
    handler=run,
)
