"""MOCK source: official-statistics style yearly time series per fuel type."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator

from podpalto_tools.registry import ToolSpec
from podpalto_tools.schemas import FuelType, ToolResult


class Indicator(str, Enum):
    AVG_RETAIL_PRICE = "avg_retail_price"
    HOUSEHOLD_CONSUMPTION = "household_consumption"


_FIRST_YEAR = 2021
_PRICE_UNITS = {
    FuelType.FIREWOOD: "CZK per prms incl. VAT",
    FuelType.BRIQUETTES: "CZK per tonne incl. VAT",
    FuelType.COAL: "CZK per tonne incl. VAT",
}
_SERIES: dict[tuple[Indicator, FuelType], list[float]] = {
    (Indicator.AVG_RETAIL_PRICE, FuelType.FIREWOOD): [1650, 2600, 2450, 2300, 2350],
    (Indicator.AVG_RETAIL_PRICE, FuelType.BRIQUETTES): [5900, 11200, 9400, 8700, 8900],
    (Indicator.AVG_RETAIL_PRICE, FuelType.COAL): [4800, 8900, 7600, 6900, 7100],
    (Indicator.HOUSEHOLD_CONSUMPTION, FuelType.FIREWOOD): [100, 108, 104, 101, 99],
    (Indicator.HOUSEHOLD_CONSUMPTION, FuelType.BRIQUETTES): [100, 121, 112, 106, 104],
    (Indicator.HOUSEHOLD_CONSUMPTION, FuelType.COAL): [100, 96, 88, 81, 74],
}
_LAST_YEAR = _FIRST_YEAR + len(next(iter(_SERIES.values()))) - 1


class DataPoint(BaseModel):
    year: int
    value: float


class MarketStatisticsInput(BaseModel):
    fuel_type: FuelType = Field(..., description="Fuel category")
    indicator: Indicator = Field(
        Indicator.AVG_RETAIL_PRICE,
        description="avg_retail_price = average household price; "
        "household_consumption = consumption index",
    )
    from_year: int = Field(_FIRST_YEAR, ge=_FIRST_YEAR, le=_LAST_YEAR)
    to_year: int = Field(_LAST_YEAR, ge=_FIRST_YEAR, le=_LAST_YEAR)

    @model_validator(mode="after")
    def _check_range(self) -> MarketStatisticsInput:
        if self.from_year > self.to_year:
            raise ValueError("from_year must not be greater than to_year")
        return self


class MarketStatisticsOutput(ToolResult):
    fuel_type: FuelType
    indicator: Indicator
    unit: str
    series: list[DataPoint]
    change_pct: float = Field(..., description="Change between the first and last year in %")


def run(params: MarketStatisticsInput) -> MarketStatisticsOutput:
    values = _SERIES[(params.indicator, params.fuel_type)]
    series = [
        DataPoint(year=year, value=values[year - _FIRST_YEAR])
        for year in range(params.from_year, params.to_year + 1)
    ]
    unit = (
        _PRICE_UNITS[params.fuel_type]
        if params.indicator is Indicator.AVG_RETAIL_PRICE
        else f"index, {_FIRST_YEAR} = 100"
    )
    return MarketStatisticsOutput(
        source="mock national statistics",
        fuel_type=params.fuel_type,
        indicator=params.indicator,
        unit=unit,
        series=series,
        change_pct=round((series[-1].value / series[0].value - 1) * 100, 1),
    )


TOOL = ToolSpec(
    name="market_statistics",
    description=(
        f"Yearly statistics ({_FIRST_YEAR}-{_LAST_YEAR}) for one fuel type: average retail "
        "price or household consumption index. Use it for long-term trends, not for "
        "current shop prices."
    ),
    input_model=MarketStatisticsInput,
    output_model=MarketStatisticsOutput,
    handler=run,
)
