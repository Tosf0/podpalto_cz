"""Models shared by all sources."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class FuelType(str, Enum):
    FIREWOOD = "firewood"
    BRIQUETTES = "briquettes"
    COAL = "coal"


class ToolResult(BaseModel):
    """Base class of every tool response, so agents always see the data provenance."""

    source: str = Field(..., description="Where the data comes from")
    mock: bool = Field(True, description="True when the data is synthetic, not real market data")
