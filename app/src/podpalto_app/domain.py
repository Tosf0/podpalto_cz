"""Domain vocabulary shared by the API, flows and crews.

Must match ``podpalto_tools.schemas`` and the extraction contract of the tools service
(the services share no code; the app tests run against the real tools service).
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class FuelType(str, Enum):
    """The seven fuel categories of the source report (PDF, section 4.3)."""

    BROWN_COAL = "brown_coal"  # hnede_uhli
    BLACK_COAL = "black_coal"  # cerne_uhli
    COKE = "coke"  # koks
    COAL_BRIQUETTES = "coal_briquettes"  # uhelne_brikety
    WOOD_PELLETS = "wood_pellets"  # drevene_pelety
    WOOD_BRIQUETTES = "wood_briquettes"  # drevene_brikety
    FIREWOOD = "firewood"  # palivove_drevo


ALL_FUEL_TYPES: list[FuelType] = list(FuelType)

OriginalUnit = Literal["kg", "q", "t", "bag", "pallet", "m3", "prmr", "prms"]


class ExtractedPriceRow(BaseModel):
    """One price-list row: verbatim quotes plus the judgements a parser cannot make.

    The agents never write a number of their own. The tools service checks every quote
    against the page and reads the price from ``price_text`` itself.
    """

    product_name: str = Field(..., description="Product name, copied exactly from the page")
    variant_text: str | None = Field(
        None,
        description="What tells this price apart from other prices of the same product on "
        "the page (log length, quantity tier, price zone, packaging), copied exactly, "
        "e.g. '25 cm' or 'nad 30 q'",
    )
    price_text: str = Field(
        ...,
        description="The text holding exactly ONE price, copied exactly, e.g. '690 Kč/q'. "
        "Never a range or several prices.",
    )
    unit_text: str | None = Field(
        None, description="Text naming the unit when price_text does not, copied exactly"
    )
    package_text: str | None = Field(
        None,
        description="Required for original_unit bag/pallet: the text stating the package "
        "weight in kg, copied exactly, e.g. 'pytel 25 kg'",
    )
    original_unit: OriginalUnit = Field(
        ...,
        description="What one price buys: kg, q (100 kg), t, bag, pallet, m3 (solid wood), "
        "prmr (stacked cubic metre), prms (loose cubic metre)",
    )
    fuel_category: FuelType
    price_includes_vat: bool | None = Field(
        None, description="True/False only when the page says so; otherwise null"
    )
    quality_standard: str | None = Field(
        None, description='Grade or certificate (ENplus A1, Rekord 4"), copied exactly'
    )
    delivery_note: str | None = Field(
        None, description="Delivery or unloading terms for this price, copied exactly"
    )
    qa_status: Literal["accepted", "rejected"] = Field(
        "accepted", description="Set by the QA auditor; rejected rows are not stored"
    )
    qa_note: str = Field("", description="Why the auditor rejected or corrected the row")


class SellerPriceExtractionList(BaseModel):
    """Output of the extraction crew for one price-list page (PDF, section 4.3)."""

    price_list_found: bool = Field(..., description="False when the page shows no prices")
    rows: list[ExtractedPriceRow] = Field(default_factory=list)
    notes: str = Field("", description="Anything the next reader of this page should know")
