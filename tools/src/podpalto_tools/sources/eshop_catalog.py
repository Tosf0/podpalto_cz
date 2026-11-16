"""MOCK source: product listings of competitor e-shops.

Replace ``_CATALOG`` / ``run`` with real scraping or a feed import later; the
input and output models are the contract the agents rely on.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from podpalto_tools.registry import ToolSpec
from podpalto_tools.schemas import FuelType, ToolResult

# (sku, seller, fuel, name, package, quantity, unit, price, delivery fee, in stock)
_ROWS: list[tuple[str, str, FuelType, str, str, float, str, int, int, bool]] = [
    ("MP-FW-01", "MockPaliva", FuelType.FIREWOOD, "Beech firewood 33 cm, kiln-dried",
     "pallet 1 prms", 1.0, "prms", 2890, 490, True),
    ("MP-FW-02", "MockPaliva", FuelType.FIREWOOD, "Spruce firewood 33 cm, air-dried",
     "pallet 1 prms", 1.0, "prms", 1990, 490, True),
    ("DT-FW-01", "DemoTopivo", FuelType.FIREWOOD, "Beech firewood 25 cm, kiln-dried",
     "big bag 1.5 prms", 1.5, "prms", 4470, 0, True),
    ("SF-FW-01", "SampleFuel", FuelType.FIREWOOD, "Oak firewood 33 cm, air-dried",
     "pallet 1 prms", 1.0, "prms", 3150, 590, False),
    ("MP-BR-01", "MockPaliva", FuelType.BRIQUETTES, "RUF hardwood briquettes",
     "pallet 960 kg", 0.96, "t", 8540, 690, True),
    ("DT-BR-01", "DemoTopivo", FuelType.BRIQUETTES, "RUF beech briquettes",
     "pallet 960 kg", 0.96, "t", 8990, 0, True),
    ("TB-BR-01", "TestBrikety", FuelType.BRIQUETTES, "Nestro cylindrical briquettes",
     "pallet 900 kg", 0.90, "t", 8370, 590, True),
    ("TB-BR-02", "TestBrikety", FuelType.BRIQUETTES, "Pini-Kay briquettes",
     "pallet 960 kg", 0.96, "t", 10460, 590, False),
    ("SF-BR-01", "SampleFuel", FuelType.BRIQUETTES, "RUF softwood briquettes",
     "pallet 960 kg", 0.96, "t", 7870, 590, True),
    ("MP-CO-01", "MockPaliva", FuelType.COAL, "Brown coal, nut 2, bulk",
     "bulk 1 t", 1.0, "t", 6490, 890, True),
    ("DT-CO-01", "DemoTopivo", FuelType.COAL, "Brown coal, nut 1, bagged 25 kg",
     "pallet 1 t", 1.0, "t", 7290, 0, True),
    ("SF-CO-01", "SampleFuel", FuelType.COAL, "Hard coal, nut, bagged 25 kg",
     "pallet 1 t", 1.0, "t", 11900, 890, True),
]  # fmt: skip


class Product(BaseModel):
    sku: str
    seller: str
    fuel_type: FuelType
    name: str
    package: str
    price_czk: int = Field(..., description="Price of one package incl. VAT")
    unit: str = Field(..., description="Comparison unit: 't' (tonne) or 'prms' (loose m3)")
    unit_price_czk: int = Field(..., description="Price per comparison unit incl. VAT")
    delivery_fee_czk: int
    in_stock: bool
    url: str


CATALOG: list[Product] = [
    Product(
        sku=sku,
        seller=seller,
        fuel_type=fuel,
        name=name,
        package=package,
        price_czk=price,
        unit=unit,
        unit_price_czk=round(price / quantity),
        delivery_fee_czk=delivery,
        in_stock=in_stock,
        url=f"https://{seller.lower()}.example/p/{sku.lower()}",
    )
    for sku, seller, fuel, name, package, quantity, unit, price, delivery, in_stock in _ROWS
]


class EshopCatalogInput(BaseModel):
    fuel_type: FuelType = Field(..., description="Fuel category to list")
    seller: str | None = Field(None, description="Only this seller (exact name); omit for all")
    in_stock_only: bool = Field(False, description="Skip products that are out of stock")


class EshopCatalogOutput(ToolResult):
    sellers: list[str]
    products: list[Product]


def run(params: EshopCatalogInput) -> EshopCatalogOutput:
    products = [
        p
        for p in CATALOG
        if p.fuel_type == params.fuel_type
        and (params.seller is None or p.seller.lower() == params.seller.lower())
        and (p.in_stock or not params.in_stock_only)
    ]
    return EshopCatalogOutput(
        source="mock competitor e-shop catalog",
        sellers=sorted({p.seller for p in products}),
        products=products,
    )


TOOL = ToolSpec(
    name="eshop_catalog",
    description=(
        "Lists products that competitor e-shops sell for one fuel type: name, package, "
        "price, unit price, delivery fee and stock status. Use it for product-level "
        "price and assortment comparison between sellers."
    ),
    input_model=EshopCatalogInput,
    output_model=EshopCatalogOutput,
    handler=run,
)
