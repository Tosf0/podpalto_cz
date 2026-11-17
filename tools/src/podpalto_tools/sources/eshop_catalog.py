"""Seller prices of solid fuels, read from the snapshot database.

The data is collected by ``podpalto_tools.collect`` (feeds, product pages, price lists).
This module only queries it: nothing is fetched and no price is computed here.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from podpalto_tools.collect import SolidFuelPriceRecord, Store, enabled_sources
from podpalto_tools.registry import ToolError, ToolSpec
from podpalto_tools.schemas import WEIGHT_FUELS, FuelType, Region, ToolResult
from podpalto_tools.settings import get_settings

SOURCE_LABEL = "seller feeds, product pages and price lists (snapshot database)"


class Product(BaseModel):
    sku: str
    product_id: str = Field(..., description="Shared by the variants of one product")
    seller: str
    seller_region: str | None = Field(None, description="Region (kraj) of the seller")
    price_region: str | None = Field(None, description="Where the price applies; CZ = nationwide")
    fuel_type: FuelType
    name: str
    quality_standard: str | None = None
    package: str = Field(..., description="What the price buys, e.g. 'pallet 960 kg', '1 q'")
    price_czk: float = Field(..., description="Price as published, incl. VAT")
    unit: str | None = Field(
        None,
        description="Comparison unit: 't' (tonne) for fuels sold by weight, 'prms' (loose "
        "cubic metre) for firewood. Prices in different units are not comparable.",
    )
    unit_price_czk: int | None = Field(
        None, description="Price per comparison unit incl. VAT; null when it could not be derived"
    )
    price_per_kg_czk: float | None = None
    price_per_kwh_czk: float | None = Field(
        None, description="Price per kWh of energy in the fuel (boiler efficiency not applied)"
    )
    heating_value: str | None = Field(
        None, description="MJ/kg used for the kWh price and whether the seller stated it"
    )
    delivery_included: bool | None = Field(None, description="null when not stated")
    delivery_fee_czk: float | None = Field(
        None, description="Lowest delivery price stated; feeds often carry a placeholder"
    )
    price_total_delivered_czk: float | None = Field(
        None, description="Price incl. delivery; null when the delivery cost is unknown"
    )
    in_stock: bool | None = Field(None, description="null when the seller does not state it")
    url: str
    collected_at: str = Field(..., description="When this price was read from the seller (UTC)")
    notes: list[str] = Field(default_factory=list, description="Data-quality flags")


def _package(record: SolidFuelPriceRecord) -> str:
    unit, quantity = record.original_unit, record.original_quantity
    if unit is None:
        return "unknown"
    if unit in ("bag", "pallet"):
        weight = f" {record.package_weight_kg:g} kg" if record.package_weight_kg else ""
        return f"{unit}{weight}"
    return f"{quantity:g} {unit}"


def _unit(record: SolidFuelPriceRecord) -> tuple[str | None, int | None]:
    if record.fuel_category in WEIGHT_FUELS:
        return "t", record.normalized_price_per_ton_vat
    return "prms", record.normalized_price_per_prms_vat


def _heating_value(record: SolidFuelPriceRecord) -> str | None:
    if record.calorific_value_mj_kg is None or record.energy_price_per_kwh_vat is None:
        return None
    origin = "stated by seller" if record.calorific_source == "seller" else "typical value"
    return f"{record.calorific_value_mj_kg:g} MJ/kg ({origin})"


def _product(record: SolidFuelPriceRecord) -> Product:
    unit, unit_price = _unit(record)
    return Product(
        sku=record.item_id,
        product_id=record.group_id or record.item_id,
        seller=record.seller_name,
        seller_region=record.seller_region,
        price_region=record.target_psc_region,
        fuel_type=record.fuel_category,
        name=record.product_name_raw,
        quality_standard=record.quality_standard,
        package=_package(record),
        price_czk=record.original_price_vat,
        unit=unit if unit_price is not None else None,
        unit_price_czk=unit_price,
        price_per_kg_czk=record.normalized_price_per_kg_vat,
        price_per_kwh_czk=record.energy_price_per_kwh_vat,
        heating_value=_heating_value(record),
        delivery_included=record.delivery_included,
        delivery_fee_czk=record.delivery_fee_czk,
        price_total_delivered_czk=record.price_total_delivered_vat,
        in_stock=record.in_stock,
        url=record.source_url,
        collected_at=record.scraped_at or "",
        notes=record.flags,
    )


def serves_region(product: Product, region: Region | None) -> bool:
    """True for nationwide prices, prices of that region and sellers based there."""
    if region is None or region is Region.CZ:
        return True
    return region.value in (product.price_region, product.seller_region) or (
        product.price_region == Region.CZ.value
    )


def load_products(fuel_type: FuelType, region: Region | None = None) -> list[Product]:
    """Current prices of all enabled sources. Raises ToolError when nothing was collected."""
    source_ids = [source.id for source in enabled_sources()]
    store = Store(get_settings().db_path)
    if not store.has_snapshot(source_ids):
        raise ToolError(
            "No prices have been collected yet. Run `POST /collect` on the tools service "
            "(or `podpalto-collect`, or the app's CollectionFlow) first."
        )
    products = [_product(record) for record in store.latest_records(source_ids, fuel_type)]
    return [product for product in products if serves_region(product, region)]


class EshopCatalogInput(BaseModel):
    fuel_type: FuelType = Field(..., description="Fuel category to list")
    region: Region | None = Field(
        None, description="Only prices valid in this region (kraj); omit or CZ for all"
    )
    seller: str | None = Field(None, description="Only this seller (exact name); omit for all")
    in_stock_only: bool = Field(False, description="Only products the seller marks as in stock")
    limit: int = Field(
        60, ge=1, le=200, description="Maximum number of products returned, cheapest first"
    )


class EshopCatalogOutput(ToolResult):
    sellers: list[str]
    total_matches: int = Field(..., description="Matching products before `limit` was applied")
    products: list[Product] = Field(
        ..., description="Cheapest unit price first; products without a unit price last"
    )
    data_collected_at: str | None = Field(None, description="Newest collection time (UTC)")


def run(params: EshopCatalogInput) -> EshopCatalogOutput:
    products = [
        p
        for p in load_products(params.fuel_type, params.region)
        if (params.seller is None or p.seller.lower() == params.seller.lower())
        and (p.in_stock or not params.in_stock_only)
    ]
    products.sort(key=lambda p: (p.unit_price_czk is None, p.unit or "", p.unit_price_czk or 0))
    return EshopCatalogOutput(
        source=SOURCE_LABEL,
        mock=False,
        sellers=sorted({p.seller for p in products}),
        total_matches=len(products),
        products=products[: params.limit],
        data_collected_at=max((p.collected_at for p in products), default=None),
    )


TOOL = ToolSpec(
    name="eshop_catalog",
    description=(
        "Lists what sellers (e-shops, coal yards, firewood sellers) charge for one fuel "
        "type: product, package, price, unit price, price per kWh, delivery, region, stock "
        "status and collection time. Real data collected from seller sites. Use it for "
        "product-level comparison; narrow it with `seller` or `region`. "
        "Quote the figures as returned; do not derive prices yourself."
    ),
    input_model=EshopCatalogInput,
    output_model=EshopCatalogOutput,
    handler=run,
    mock=False,
)
