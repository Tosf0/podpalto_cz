"""MOCK source: customer reviews of solid-fuel sellers."""

from __future__ import annotations

from pydantic import BaseModel, Field

from podpalto_tools.registry import ToolSpec
from podpalto_tools.schemas import FuelType, ToolResult


class Review(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    fuel_type: FuelType
    published: str = Field(..., description="ISO date")
    text: str


class SellerReviews(BaseModel):
    seller: str
    rating_avg: float
    reviews_count: int
    positive_themes: list[str]
    negative_themes: list[str]
    samples: list[Review]


_F, _B, _C = FuelType.FIREWOOD, FuelType.WOOD_BRIQUETTES, FuelType.BROWN_COAL
_P, _K = FuelType.WOOD_PELLETS, FuelType.COKE
SELLERS: list[SellerReviews] = [
    SellerReviews(
        seller="MockPaliva",
        rating_avg=4.6,
        reviews_count=812,
        positive_themes=["fast delivery", "dry wood", "helpful driver"],
        negative_themes=["delivery fee", "narrow delivery time window"],
        samples=[
            Review(rating=5, fuel_type=_F, published="2026-10-11",
                   text="Beech was really dry, delivered in three days."),
            Review(rating=4, fuel_type=_B, published="2026-09-28",
                   text="Good briquettes, but the delivery fee makes it pricey."),
            Review(rating=3, fuel_type=_C, published="2026-09-02",
                   text="Coal quality fine, more dust than expected."),
        ],
    ),
    SellerReviews(
        seller="DemoTopivo",
        rating_avg=4.3,
        reviews_count=1540,
        positive_themes=["free delivery", "wide assortment", "online payment"],
        negative_themes=["long delivery in autumn", "slow customer support"],
        samples=[
            Review(rating=5, fuel_type=_B, published="2026-10-03",
                   text="Free delivery of the whole pallet, briquettes burn long."),
            Review(rating=2, fuel_type=_F, published="2026-10-15",
                   text="Waited almost four weeks in October, nobody answered e-mails."),
            Review(rating=4, fuel_type=_C, published="2026-08-19",
                   text="Bagged coal is clean and easy to store."),
            Review(rating=5, fuel_type=_P, published="2026-09-25",
                   text="Pellets with almost no dust, the boiler runs without trouble."),
        ],
    ),
    SellerReviews(
        seller="TestBrikety",
        rating_avg=4.8,
        reviews_count=265,
        positive_themes=["briquette quality", "low ash", "expert advice"],
        negative_themes=["often out of stock", "briquettes only"],
        samples=[
            Review(rating=5, fuel_type=_B, published="2026-09-21",
                   text="Best briquettes I have tried, almost no ash."),
            Review(rating=4, fuel_type=_B, published="2026-10-09",
                   text="Great product, but Pini-Kay was sold out again."),
        ],
    ),
    SellerReviews(
        seller="SampleFuel",
        rating_avg=3.9,
        reviews_count=430,
        positive_themes=["lowest prices", "hard coal available"],
        negative_themes=["inconsistent quality", "damaged packaging", "stock not up to date"],
        samples=[
            Review(rating=4, fuel_type=_B, published="2026-09-14",
                   text="Cheapest briquettes around, softwood burns faster though."),
            Review(rating=2, fuel_type=_F, published="2026-10-01",
                   text="Ordered oak shown as available, then told it was out of stock."),
            Review(rating=3, fuel_type=_C, published="2026-08-30",
                   text="Good price for hard coal, several bags arrived torn."),
            Review(rating=4, fuel_type=_K, published="2026-09-08",
                   text="Coke is hard to find elsewhere, delivery took two weeks."),
            Review(rating=3, fuel_type=_P, published="2026-10-05",
                   text="Cheap pellets, but more ash than the certified ones."),
        ],
    ),
]  # fmt: skip


class CustomerReviewsInput(BaseModel):
    seller: str | None = Field(None, description="Only this seller (exact name); omit for all")
    fuel_type: FuelType | None = Field(
        None, description="Only sample reviews about this fuel; sellers without any are skipped"
    )


class CustomerReviewsOutput(ToolResult):
    sellers: list[SellerReviews]


def run(params: CustomerReviewsInput) -> CustomerReviewsOutput:
    result: list[SellerReviews] = []
    for seller in SELLERS:
        if params.seller is not None and seller.seller.lower() != params.seller.lower():
            continue
        if params.fuel_type is not None:
            samples = [r for r in seller.samples if r.fuel_type == params.fuel_type]
            if not samples:
                continue
            seller = seller.model_copy(update={"samples": samples})
        result.append(seller)
    return CustomerReviewsOutput(source="mock review platform", sellers=result)


TOOL = ToolSpec(
    name="customer_reviews",
    description=(
        "Customer reviews of solid-fuel sellers: average rating, review count, recurring "
        "positive and negative themes and sample reviews. Ratings and themes cover the "
        "whole seller; only the samples are filtered by fuel type."
    ),
    input_model=CustomerReviewsInput,
    output_model=CustomerReviewsOutput,
    handler=run,
)
