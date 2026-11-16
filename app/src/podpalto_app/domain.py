"""Domain vocabulary shared by the API, flows and crews."""

from __future__ import annotations

from enum import Enum


class FuelType(str, Enum):
    FIREWOOD = "firewood"
    BRIQUETTES = "briquettes"
    COAL = "coal"


ALL_FUEL_TYPES: list[FuelType] = list(FuelType)
