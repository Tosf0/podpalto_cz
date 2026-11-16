import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import app
from podpalto_tools.sources import ALL_TOOLS

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_catalog_lists_every_tool_with_schema():
    catalog = client.get("/tools").json()
    assert [tool["name"] for tool in catalog] == [spec.name for spec in ALL_TOOLS]
    assert all(tool["description"] and tool["input_schema"]["properties"] for tool in catalog)


@pytest.mark.parametrize(
    ("name", "payload"),
    [
        ("eshop_catalog", {"fuel_type": "briquettes"}),
        ("price_comparison", {"fuel_type": "coal"}),
        ("market_statistics", {"fuel_type": "firewood"}),
        ("news_search", {"query": "subsidy", "fuel_type": "briquettes"}),
        ("customer_reviews", {"fuel_type": "coal"}),
    ],
)
def test_mock_tools_return_flagged_data(name, payload):
    response = client.post(f"/tools/{name}", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["mock"] is True
    assert body["source"]


def test_eshop_catalog_filters():
    body = client.post(
        "/tools/eshop_catalog",
        json={"fuel_type": "briquettes", "seller": "testbrikety", "in_stock_only": True},
    ).json()
    assert body["sellers"] == ["TestBrikety"]
    assert [p["sku"] for p in body["products"]] == ["TB-BR-01"]
    assert body["products"][0]["unit_price_czk"] == 9300


def test_price_comparison_aggregates_catalog():
    body = client.post("/tools/price_comparison", json={"fuel_type": "coal"}).json()
    assert body["offers_count"] == 3
    assert body["unit"] == "t"
    assert (body["min_unit_price_czk"], body["max_unit_price_czk"]) == (6490, 11900)
    assert body["offers"][0]["seller"] == "MockPaliva"


def test_price_comparison_without_matches():
    body = client.post(
        "/tools/price_comparison", json={"fuel_type": "coal", "product_query": "no such product"}
    ).json()
    assert body["offers_count"] == 0
    assert body["avg_unit_price_czk"] is None


def test_market_statistics_range_and_change():
    body = client.post(
        "/tools/market_statistics",
        json={"fuel_type": "coal", "indicator": "household_consumption", "from_year": 2022},
    ).json()
    assert [point["year"] for point in body["series"]] == [2022, 2023, 2024, 2025]
    assert body["change_pct"] == -22.9


def test_news_search_ranks_keyword_matches_first():
    body = client.post("/tools/news_search", json={"query": "VAT", "limit": 2}).json()
    assert body["total_matches"] == 8
    assert len(body["articles"]) == 2
    assert "VAT" in body["articles"][0]["title"]


def test_invalid_input_is_rejected():
    assert client.post("/tools/eshop_catalog", json={"fuel_type": "pellets"}).status_code == 422
    assert (
        client.post(
            "/tools/market_statistics",
            json={"fuel_type": "coal", "from_year": 2025, "to_year": 2021},
        ).status_code
        == 422
    )
