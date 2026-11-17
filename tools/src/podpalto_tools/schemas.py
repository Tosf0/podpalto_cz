"""Models shared by all sources."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class FuelType(str, Enum):
    """The seven fuel categories of the source report (PDF, section 4.3, `fuel_category`).

    English values; the report's Czech literal is given next to each one.
    """

    BROWN_COAL = "brown_coal"  # hnede_uhli
    BLACK_COAL = "black_coal"  # cerne_uhli
    COKE = "coke"  # koks
    COAL_BRIQUETTES = "coal_briquettes"  # uhelne_brikety (Rekord and similar)
    WOOD_PELLETS = "wood_pellets"  # drevene_pelety
    WOOD_BRIQUETTES = "wood_briquettes"  # drevene_brikety (RUF, cylinders, Pini Kay)
    FIREWOOD = "firewood"  # palivove_drevo


#: Fuels sold by weight; their comparison unit is CZK per tonne. Firewood is sold by volume.
WEIGHT_FUELS = frozenset(FuelType) - {FuelType.FIREWOOD}


class Region(str, Enum):
    """The 14 regions (kraje) of the Czech Republic, plus the whole country."""

    CZ = "CZ"
    PRAHA = "Hlavní město Praha"
    STREDOCESKY = "Středočeský kraj"
    JIHOCESKY = "Jihočeský kraj"
    PLZENSKY = "Plzeňský kraj"
    KARLOVARSKY = "Karlovarský kraj"
    USTECKY = "Ústecký kraj"
    LIBERECKY = "Liberecký kraj"
    KRALOVEHRADECKY = "Královéhradecký kraj"
    PARDUBICKY = "Pardubický kraj"
    VYSOCINA = "Kraj Vysočina"
    JIHOMORAVSKY = "Jihomoravský kraj"
    OLOMOUCKY = "Olomoucký kraj"
    ZLINSKY = "Zlínský kraj"
    MORAVSKOSLEZSKY = "Moravskoslezský kraj"


class ToolResult(BaseModel):
    """Base class of every tool response, so agents always see the data provenance."""

    source: str = Field(..., description="Where the data comes from")
    mock: bool = Field(True, description="True when the data is synthetic, not real market data")
