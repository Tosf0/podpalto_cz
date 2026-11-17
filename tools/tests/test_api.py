import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import app, create_app
from podpalto_tools.collect import collect_all
from podpalto_tools.sources import ALL_TOOLS

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_catalog_lists_every_tool_with_schema():
    catalog = client.get("/tools").json()
    assert [tool["name"] for tool in catalog] == [spec.name for spec in ALL_TOOLS]
    assert all(tool["description"] and tool["input_schema"]["properties"] for tool in catalog)
    mock_flags = {tool["name"]: tool["mock"] for tool in catalog}
    assert mock_flags == {
        "eshop_catalog": False,
        "price_comparison": False,
        "heating_demand": False,
        "market_statistics": True,
        "news_search": True,
        "customer_reviews": True,
        "page_text": False,
    }


# --- tools backed by the snapshot database -------------------------------------------------


@pytest.mark.parametrize("name", ["eshop_catalog", "price_comparison"])
def test_catalog_tools_fail_clearly_before_the_first_collection(name):
    response = client.post(f"/tools/{name}", json={"fuel_type": "wood_pellets"})
    assert response.status_code == 502
    assert "POST /collect" in response.json()["detail"]


def test_eshop_catalog_returns_collected_prices(collected):
    body = client.post("/tools/eshop_catalog", json={"fuel_type": "wood_pellets"}).json()
    assert body["mock"] is False
    assert body["sellers"] == ["DemoPaliva"]
    assert body["data_collected_at"] == collected.fetched_at
    by_sku = {p["sku"]: p for p in body["products"]}
    assert set(by_sku) == {"101", "102", "103"}

    pallet = by_sku["101"]
    assert (pallet["package"], pallet["unit"], pallet["unit_price_czk"]) == (
        "pallet 1050 kg", "t", 13000,
    )  # fmt: skip
    assert (pallet["price_per_kg_czk"], pallet["price_per_kwh_czk"]) == (13.0, 2.71)
    assert pallet["heating_value"] == "17.3 MJ/kg (stated by seller)"
    assert pallet["quality_standard"] == "ENplus A1"
    assert pallet["in_stock"] is True
    assert pallet["collected_at"] == collected.fetched_at

    assert by_sku["102"]["heating_value"] == "16.9 MJ/kg (typical value)"
    assert by_sku["102"]["in_stock"] is False
    big_bag = by_sku["103"]
    assert (big_bag["package"], big_bag["unit_price_czk"]) == ("unknown", None)
    assert big_bag["in_stock"] is None
    assert big_bag["notes"] == ["package_size_unknown"]


def test_eshop_catalog_filters(collected):
    in_stock = client.post(
        "/tools/eshop_catalog", json={"fuel_type": "wood_pellets", "in_stock_only": True}
    ).json()
    assert [p["sku"] for p in in_stock["products"]] == ["101"]
    other_seller = client.post(
        "/tools/eshop_catalog", json={"fuel_type": "wood_pellets", "seller": "nobody"}
    ).json()
    assert other_seller["products"] == [] and other_seller["data_collected_at"] is None
    coke = client.post("/tools/eshop_catalog", json={"fuel_type": "coke"}).json()
    assert [(p["sku"], p["unit_price_czk"]) for p in coke["products"]] == [("401", 18000)]


def test_region_filter_keeps_nationwide_and_regional_prices(collected, fetch, data_dir):
    # The fixture shop has no region: it is not offered to a region filter.
    body = client.post(
        "/tools/eshop_catalog", json={"fuel_type": "coke", "region": "Kraj Vysočina"}
    ).json()
    assert body["products"] == []
    registry = data_dir.parent / "sources.yaml"
    registry.write_text(
        registry.read_text(encoding="utf-8").replace(
            "kind: heureka_feed\n    feed_path: /heureka/export/products.xml\n  - id: blocked",
            "kind: heureka_feed\n    feed_path: /heureka/export/products.xml\n"
            "    price_region: CZ\n  - id: blocked",
        ),
        encoding="utf-8",
    )
    collect_all(fetch=fetch)
    body = client.post(
        "/tools/eshop_catalog", json={"fuel_type": "coke", "region": "Kraj Vysočina"}
    ).json()
    assert [(p["sku"], p["price_region"]) for p in body["products"]] == [("401", "CZ")]


def test_price_comparison_aggregates_comparable_offers(collected):
    body = client.post("/tools/price_comparison", json={"fuel_type": "wood_briquettes"}).json()
    assert body["mock"] is False
    # 203 has an implausible unit price and must not distort the statistics.
    assert (body["unit"], body["offers_count"], body["excluded_count"]) == ("t", 2, 1)
    assert (body["min_unit_price_czk"], body["max_unit_price_czk"]) == (12000, 12000)
    assert (body["min_price_per_kwh_czk"], body["avg_price_per_kwh_czk"]) == (2.41, 2.44)
    brown = client.post("/tools/price_comparison", json={"fuel_type": "brown_coal"}).json()
    assert [o["product"] for o in brown["offers"]] == ["Hnědé uhlí ořech 2"]
    rekord = client.post("/tools/price_comparison", json={"fuel_type": "coal_briquettes"}).json()
    assert [(o["product"], o["unit_price_czk"]) for o in rekord["offers"]] == [
        ("Brikety Rekord - paleta 900 kg", 9900)
    ]


def test_firewood_is_compared_per_loose_cubic_metre(collected):
    firewood = client.post("/tools/price_comparison", json={"fuel_type": "firewood"}).json()
    # 501 is loose (1 prms), 504 stacked (2 prmr = 3.2 prms); the crate and PackFix in
    # unspecified m3 and the size-less log are left out.
    assert (firewood["unit"], firewood["offers_count"], firewood["excluded_count"]) == (
        "prms", 2, 3,
    )  # fmt: skip
    assert (firewood["min_unit_price_czk"], firewood["max_unit_price_czk"]) == (1890, 3122)
    assert firewood["min_price_per_kwh_czk"] == 1.43


def test_price_comparison_counts_each_product_once(collected):
    body = client.post("/tools/price_comparison", json={"fuel_type": "wood_pellets"}).json()
    # 101 (pallet) and 102 (bag) are variants of one product; the Big Bag has no unit price.
    assert (body["offers_count"], body["variants_merged"], body["excluded_count"]) == (1, 1, 1)
    assert (body["min_unit_price_czk"], body["max_unit_price_czk"]) == (13000, 13000)
    assert [o["package"] for o in body["offers"]] == ["pallet 1050 kg"]


def test_limits_keep_tool_output_small(collected):
    catalog = client.post("/tools/eshop_catalog", json={"fuel_type": "firewood", "limit": 2}).json()
    assert catalog["total_matches"] == 5
    # Cheapest first; products without a unit price come last.
    assert [p["sku"] for p in catalog["products"]] == ["501", "504"]
    comparison = client.post(
        "/tools/price_comparison", json={"fuel_type": "wood_briquettes", "limit": 1}
    ).json()
    assert (comparison["offers_count"], len(comparison["offers"])) == (2, 1)


def test_price_comparison_without_matches(collected):
    body = client.post(
        "/tools/price_comparison",
        json={"fuel_type": "brown_coal", "product_query": "no such product"},
    ).json()
    assert body["offers_count"] == 0
    assert body["avg_unit_price_czk"] is None


# --- collection endpoints ------------------------------------------------------------------


def test_collect_and_sources_endpoints(fetch):
    api = TestClient(create_app(fetch=fetch))
    before = {row["source"]["id"]: row for row in api.get("/sources").json()}
    assert before["demopaliva"]["last_snapshot"] is None
    assert before["blocked"]["source"]["enabled"] is False

    started = api.post("/collect")  # TestClient finishes the background run before returning
    assert started.status_code == 202
    assert started.json()["source_ids"] == ["demopaliva"]
    after = {row["source"]["id"]: row for row in api.get("/sources").json()}
    assert after["demopaliva"]["last_snapshot"]["status"] == "ok"
    assert after["demopaliva"]["last_snapshot"]["offer_count"] == 14
    assert after["demopaliva"]["entry_url"].endswith("/heureka/export/products.xml")
    assert api.post("/tools/eshop_catalog", json={"fuel_type": "coke"}).status_code == 200


def test_only_one_collection_runs_at_a_time(fetch):
    second_request: list[int] = []

    def fetch_and_try_again(url):
        if not second_request:
            second_request.append(api.post("/collect").status_code)
        return fetch(url)

    api = TestClient(create_app(fetch=fetch_and_try_again))
    assert api.post("/collect").status_code == 202
    assert second_request == [409]
    assert api.post("/collect").status_code == 202  # the lock is released afterwards


def test_collect_rejects_unknown_source(fetch):
    api = TestClient(create_app(fetch=fetch))
    response = api.post("/collect", json={"source_ids": ["nope"]})
    assert response.status_code == 404
    assert fetch.requested == []


def test_disabling_a_source_stops_serving_its_offers(collected, data_dir):
    registry = data_dir.parent / "sources.yaml"
    registry.write_text(
        registry.read_text(encoding="utf-8").replace(
            "feed_path: /heureka/export/products.xml\n  - id: blocked",
            "feed_path: /heureka/export/products.xml\n    enabled: false\n  - id: blocked",
        ),
        encoding="utf-8",
    )
    response = client.post("/tools/eshop_catalog", json={"fuel_type": "wood_pellets"})
    assert response.status_code == 502


# --- mock tools ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("name", "payload"),
    [
        ("market_statistics", {"fuel_type": "firewood"}),
        ("market_statistics", {"fuel_type": "wood_pellets"}),
        ("market_statistics", {"fuel_type": "coke", "indicator": "household_consumption"}),
        ("news_search", {"query": "subsidy", "fuel_type": "wood_pellets"}),
        ("customer_reviews", {"fuel_type": "coke"}),
    ],
)
def test_mock_tools_return_flagged_data(name, payload):
    response = client.post(f"/tools/{name}", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["mock"] is True
    assert body["source"]


def test_market_statistics_range_and_change():
    body = client.post(
        "/tools/market_statistics",
        json={"fuel_type": "brown_coal", "indicator": "household_consumption", "from_year": 2022},
    ).json()
    assert [point["year"] for point in body["series"]] == [2022, 2023, 2024, 2025]
    assert body["change_pct"] == -22.9


def test_news_search_ranks_keyword_matches_first():
    body = client.post("/tools/news_search", json={"query": "VAT", "limit": 2}).json()
    assert body["total_matches"] == 8
    assert len(body["articles"]) == 2
    assert "VAT" in body["articles"][0]["title"]


def test_invalid_input_is_rejected():
    assert client.post("/tools/eshop_catalog", json={"fuel_type": "peat"}).status_code == 422
    assert (
        client.post(
            "/tools/market_statistics",
            json={"fuel_type": "brown_coal", "from_year": 2025, "to_year": 2021},
        ).status_code
        == 422
    )
