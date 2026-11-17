"""REAL source: where households heat with solid fuels (ČSÚ, Census 2021), per region."""

from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, Field

from podpalto_tools.collect.opendata import summary_path
from podpalto_tools.registry import ToolError, ToolSpec
from podpalto_tools.schemas import FuelType, Region, ToolResult
from podpalto_tools.settings import get_settings

Group = Literal["coal_coke_briquettes", "wood_and_wood_briquettes", "wood_pellets"]

# Fuel category of the price records -> census group of the main heating source.
FUEL_TO_GROUP: dict[FuelType, Group] = {
    FuelType.BROWN_COAL: "coal_coke_briquettes",
    FuelType.BLACK_COAL: "coal_coke_briquettes",
    FuelType.COKE: "coal_coke_briquettes",
    FuelType.COAL_BRIQUETTES: "coal_coke_briquettes",
    FuelType.FIREWOOD: "wood_and_wood_briquettes",
    FuelType.WOOD_BRIQUETTES: "wood_and_wood_briquettes",
    FuelType.WOOD_PELLETS: "wood_pellets",
}


class RegionHeating(BaseModel):
    region: str
    dwellings_total: int = Field(..., description="Occupied dwellings in the region")
    coal_coke_briquettes: int = Field(..., description="Dwellings heated mainly by coal, coke "
                                      "or coal briquettes")  # fmt: skip
    wood_and_wood_briquettes: int = Field(..., description="Dwellings heated mainly by wood "
                                          "or wood briquettes")  # fmt: skip
    wood_pellets: int = Field(..., description="Dwellings heated mainly by wood pellets")
    share_pct: dict[str, float] = Field(..., description="Each group as % of all dwellings")


class HeatingDemandInput(BaseModel):
    fuel_type: FuelType | None = Field(
        None, description="Rank regions by the census group of this fuel; omit for all groups"
    )
    region: Region | None = Field(None, description="Only this region (kraj); omit for all")


class HeatingDemandOutput(ToolResult):
    census_date: str
    group: str | None = Field(None, description="Census group used for ranking")
    regions: list[RegionHeating] = Field(
        ..., description="CZ first, then regions ranked by the share of the group"
    )
    note: str = (
        "Counts dwellings by their MAIN heating source on the census date. It shows where "
        "demand is, not how much fuel is sold. Wood briquettes are counted with firewood."
    )


def run(params: HeatingDemandInput) -> HeatingDemandOutput:
    path = summary_path(get_settings())
    if not path.is_file():
        raise ToolError(
            "Census data is not loaded yet. Run `podpalto-load-opendata` on the tools service."
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    group = FUEL_TO_GROUP[params.fuel_type] if params.fuel_type else None

    rows = []
    for name, counts in data["regions"].items():
        if params.region and name not in (params.region.value, "CZ"):
            continue
        total = counts["total"]
        rows.append(
            RegionHeating(
                region=name,
                dwellings_total=total,
                coal_coke_briquettes=counts["coal_coke_briquettes"],
                wood_and_wood_briquettes=counts["wood_and_wood_briquettes"],
                wood_pellets=counts["wood_pellets"],
                share_pct={
                    key: round(counts[key] / total * 100, 1)
                    for key in ("coal_coke_briquettes", "wood_and_wood_briquettes", "wood_pellets")
                },
            )
        )
    rank = group or "coal_coke_briquettes"
    rows.sort(key=lambda r: (r.region != "CZ", -r.share_pct[rank]))
    return HeatingDemandOutput(
        source=f"ČSÚ, Sčítání 2021: obydlené byty podle hlavního zdroje energie k vytápění "
        f"({data['source']})",
        mock=False,
        census_date=data["census_date"],
        group=group,
        regions=rows,
    )


TOOL = ToolSpec(
    name="heating_demand",
    description=(
        "Where households heat with solid fuels: occupied dwellings whose main heating source "
        "is coal/coke/coal briquettes, wood/wood briquettes or wood pellets, per region (kraj), "
        "with shares in %. Official census data (ČSÚ, 2021). Use it to describe regional "
        "demand next to prices. Quote the figures as returned."
    ),
    input_model=HeatingDemandInput,
    output_model=HeatingDemandOutput,
    handler=run,
    mock=False,
)
