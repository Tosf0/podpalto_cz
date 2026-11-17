"""MOCK source: news and regulation articles about the solid-fuel market."""

from __future__ import annotations

import re
from enum import Enum

from pydantic import BaseModel, Field

from podpalto_tools.registry import ToolSpec
from podpalto_tools.schemas import FuelType, ToolResult


class Topic(str, Enum):
    REGULATION = "regulation"
    SUBSIDIES = "subsidies"
    PRICES = "prices"
    SUPPLY = "supply"


class Article(BaseModel):
    title: str
    published: str = Field(..., description="ISO date")
    outlet: str
    topic: Topic
    fuel_types: list[FuelType]
    summary: str
    url: str


_F, _B, _C = FuelType.FIREWOOD, FuelType.WOOD_BRIQUETTES, FuelType.BROWN_COAL
_P, _K = FuelType.WOOD_PELLETS, FuelType.COKE
_ROWS: list[tuple[str, str, Topic, list[FuelType], str]] = [
    ("Stricter emission limits proposed for household solid-fuel boilers", "2026-10-21",
     Topic.REGULATION, [_C, _K, _F],
     "A draft amendment would tighten emission classes for small boilers and stoves; "
     "older coal boilers would face earlier phase-out deadlines."),
    ("Boiler replacement subsidy round reopens with higher support for biomass", "2026-09-30",
     Topic.SUBSIDIES, [_F, _B, _P],
     "The new subsidy call favours switching from coal to biomass boilers, which is "
     "expected to raise demand for pellets, wood briquettes and firewood."),
    ("Coal retail prices edge up before the heating season", "2026-10-06",
     Topic.PRICES, [_C, _K],
     "Retailers report brown coal prices about 3 % higher year on year, citing "
     "emission allowance costs and lower domestic output."),
    ("Briquette prices stabilise after two volatile seasons", "2026-09-12",
     Topic.PRICES, [_B],
     "Wholesale prices of hardwood briquettes are flat year on year; sellers compete "
     "mainly on free delivery and pallet discounts."),
    ("Sawmill output drop tightens supply of sawdust for briquette makers", "2026-08-25",
     Topic.SUPPLY, [_B, _P],
     "Lower construction activity reduced sawmill residues; smaller producers warn "
     "of limited stock of pellets and RUF briquettes in peak months."),
    ("Bark beetle salvage logging ends, firewood supply normalises", "2026-07-14",
     Topic.SUPPLY, [_F],
     "With salvage logging over, spruce firewood is less abundant and its discount "
     "against beech is narrowing."),
    ("Mine operator confirms earlier closure of a brown coal quarry", "2026-06-02",
     Topic.SUPPLY, [_C],
     "Graded household coal from the quarry will be available for fewer seasons than "
     "planned; retailers are looking for import alternatives."),
    ("Reduced VAT rate on firewood under review", "2026-05-18",
     Topic.REGULATION, [_F, _B, _P],
     "The finance ministry is reviewing reduced VAT rates on heating fuels; a change "
     "would directly affect consumer prices of firewood, briquettes and pellets."),
]  # fmt: skip

ARTICLES: list[Article] = [
    Article(
        title=title,
        published=published,
        outlet="Mock Energy Daily",
        topic=topic,
        fuel_types=fuels,
        summary=summary,
        url=f"https://mock-energy-daily.example/articles/{index}",
    )
    for index, (title, published, topic, fuels, summary) in enumerate(_ROWS, start=1)
]


class NewsSearchInput(BaseModel):
    query: str = Field("", description="Keywords; articles matching more keywords rank first")
    fuel_type: FuelType | None = Field(None, description="Only articles about this fuel")
    topic: Topic | None = Field(None, description="Only articles on this topic")
    limit: int = Field(5, ge=1, le=20)


class NewsSearchOutput(ToolResult):
    total_matches: int
    articles: list[Article]


def run(params: NewsSearchInput) -> NewsSearchOutput:
    words = set(re.findall(r"\w+", params.query.lower()))

    def hits(article: Article) -> int:
        text = f"{article.title} {article.summary}".lower()
        return len(words & set(re.findall(r"\w+", text)))

    matches = [
        a
        for a in ARTICLES
        if (params.fuel_type is None or params.fuel_type in a.fuel_types)
        and (params.topic is None or a.topic == params.topic)
    ]
    matches.sort(key=lambda a: a.published, reverse=True)  # newest first...
    matches.sort(key=hits, reverse=True)  # ...within the same keyword score (stable sort)
    return NewsSearchOutput(
        source="mock news archive",
        total_matches=len(matches),
        articles=matches[: params.limit],
    )


TOOL = ToolSpec(
    name="news_search",
    description=(
        "Searches news about the solid-fuel market: regulation, subsidies, prices and "
        "supply. Filter by fuel type and topic. Use it to find external factors that "
        "will influence demand and prices."
    ),
    input_model=NewsSearchInput,
    output_model=NewsSearchOutput,
    handler=run,
)
