"""Market price level per fuel type, aggregated from the collected seller prices."""

from __future__ import annotations

from statistics import mean

from pydantic import BaseModel, Field

from podpalto_tools.registry import ToolSpec
from podpalto_tools.schemas import WEIGHT_FUELS, FuelType, Region, ToolResult
from podpalto_tools.sources.eshop_catalog import SOURCE_LABEL, Product, load_products


class Offer(BaseModel):
    seller: str
    seller_region: str | None = None
    product: str
    package: str
    unit_price_czk: int
    price_per_kwh_czk: float | None = None
    price_total_delivered_czk: float | None = None
    in_stock: bool | None = None
    flags: list[str] = Field(default_factory=list)
    url: str


class PriceComparisonInput(BaseModel):
    fuel_type: FuelType = Field(..., description="Fuel category to compare")
    region: Region | None = Field(
        None, description="Only prices valid in this region (kraj); omit or CZ for all"
    )
    product_query: str | None = Field(
        None, description="Optional keyword the product name must contain, e.g. 'buk' or 'RUF'"
    )
    limit: int = Field(25, ge=1, le=100, description="Maximum number of offers listed")


class PriceComparisonOutput(ToolResult):
    fuel_type: FuelType
    region: str = "CZ"
    unit: str = Field(
        ..., description="Unit of all unit prices below: 't' (tonne) or 'prms' (loose m3)"
    )
    offers_count: int = Field(
        ..., description="Products included in the statistics, each at its cheapest variant"
    )
    variants_merged: int = Field(
        0, description="Further variants of those products (other sizes, delivery modes) left out"
    )
    excluded_count: int = Field(
        0, description="Matching prices left out because no reliable unit price was derived"
    )
    outliers_count: int = Field(
        0,
        description="Included offers flagged 'outlier_vs_market' (below half / above double "
        "the median of the other sellers); check them before quoting",
    )
    min_unit_price_czk: int | None = None
    avg_unit_price_czk: int | None = None
    max_unit_price_czk: int | None = None
    min_price_per_kwh_czk: float | None = None
    avg_price_per_kwh_czk: float | None = None
    offers: list[Offer] = Field(
        default_factory=list, description="Included offers, cheapest first, at most `limit`"
    )
    data_collected_at: str | None = Field(None, description="Newest collection time (UTC)")


def run(params: PriceComparisonInput) -> PriceComparisonOutput:
    query = (params.product_query or "").lower()
    unit = "t" if params.fuel_type in WEIGHT_FUELS else "prms"
    matches = [p for p in load_products(params.fuel_type, params.region) if query in p.name.lower()]
    priced = sorted(
        (p for p in matches if p.unit_price_czk is not None), key=lambda p: p.unit_price_czk
    )
    result = PriceComparisonOutput(
        source=SOURCE_LABEL,
        mock=False,
        fuel_type=params.fuel_type,
        region=params.region.value if params.region else "CZ",
        unit=unit,
        offers_count=0,
        excluded_count=len(matches),
    )
    if not priced:
        return result

    # One entry per product, its cheapest variant. Otherwise a shop that lists every
    # length and moisture as a variant would outweigh all other sellers in the average.
    cheapest: dict[tuple[str, str], Product] = {}
    for product in priced:
        cheapest.setdefault((product.seller, product.product_id), product)
    included = list(cheapest.values())
    prices = [p.unit_price_czk for p in included]
    per_kwh = [p.price_per_kwh_czk for p in included if p.price_per_kwh_czk is not None]

    result.offers_count = len(included)
    result.excluded_count = len(matches) - len(priced)
    result.variants_merged = len(priced) - len(included)
    result.outliers_count = sum("outlier_vs_market" in p.notes for p in included)
    result.min_unit_price_czk = min(prices)
    result.avg_unit_price_czk = round(mean(prices))
    result.max_unit_price_czk = max(prices)
    if per_kwh:
        result.min_price_per_kwh_czk = min(per_kwh)
        result.avg_price_per_kwh_czk = round(mean(per_kwh), 2)
    result.offers = [
        Offer(
            seller=p.seller,
            seller_region=p.seller_region,
            product=p.name,
            package=p.package,
            unit_price_czk=p.unit_price_czk,
            price_per_kwh_czk=p.price_per_kwh_czk,
            price_total_delivered_czk=p.price_total_delivered_czk,
            in_stock=p.in_stock,
            flags=p.notes,
            url=p.url,
        )
        for p in included[: params.limit]
    ]
    result.data_collected_at = max(p.collected_at for p in included)
    return result


TOOL = ToolSpec(
    name="price_comparison",
    description=(
        "Price level for one fuel type across all collected sellers: min, average and max "
        "unit price (CZK/t, or CZK/prms for firewood), price per kWh and the offers ranked "
        "from cheapest. Each product counts once, at its cheapest variant. Real data "
        "collected from seller sites. Use `region` for one kraj. "
        "Quote the figures as returned; do not derive prices yourself."
    ),
    input_model=PriceComparisonInput,
    output_model=PriceComparisonOutput,
    handler=run,
    mock=False,
)
