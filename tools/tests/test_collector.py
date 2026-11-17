"""Collector behaviour: storage, change detection, refusals and politeness."""

from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from podpalto_tools.collect import Store, collect_all, load_sources
from podpalto_tools.collect.collector import FetchError, collect_source
from podpalto_tools.schemas import FuelType
from podpalto_tools.settings import get_settings

FEED = (Path(__file__).parent / "fixtures" / "heureka_feed.xml").read_bytes()

FEED_URL = "https://demopaliva.example/heureka/export/products.xml"
ROBOTS_URL = "https://demopaliva.example/robots.txt"


def test_collect_stores_snapshot_offers_and_raw_copy(collected, fetch, data_dir):
    assert (collected.items, collected.offers, collected.changed) == (17, 14, True)
    assert collected.detail == "1 incomplete items skipped"
    assert fetch.requested == [ROBOTS_URL, FEED_URL]  # two requests, nothing else

    store = Store(get_settings().db_path)
    snapshot = store.last_snapshot("demopaliva")
    assert (snapshot.status, snapshot.item_count, snapshot.offer_count) == ("ok", 17, 14)
    assert (data_dir / snapshot.raw_path).read_bytes() == FEED

    coal = store.latest_records(["demopaliva"], FuelType.BROWN_COAL)
    assert [
        (o.item_id, o.normalized_price_per_ton_vat, o.energy_price_per_kwh_vat) for o in coal
    ] == [
        ("301", 8000, 1.6),
    ]
    briquettes = store.latest_records(["demopaliva"], FuelType.COAL_BRIQUETTES)
    assert [(o.item_id, o.normalized_price_per_ton_vat) for o in briquettes] == [("302", 9900)]
    assert all(o.scraped_at == snapshot.fetched_at for o in coal + briquettes)


def test_unchanged_feed_reuses_the_raw_copy(collected, fetch, data_dir):
    (second,) = collect_all(fetch=fetch)
    assert (second.status, second.changed, second.offers) == ("ok", False, 14)
    assert len(list((data_dir / "raw" / "demopaliva").iterdir())) == 1
    # Only the newest snapshot is served, so offers are not duplicated.
    assert len(Store(get_settings().db_path).latest_records(["demopaliva"])) == 14


def test_forbidden_feed_is_recorded_and_old_data_stays(collected, fetch):
    fetch.pages[FEED_URL] = (403, b"Forbidden")
    (result,) = collect_all(fetch=fetch)
    assert (result.status, result.http_status) == ("error", 403)
    assert fetch.requested.count(FEED_URL) == 2  # one per run: no retry, no other path tried

    store = Store(get_settings().db_path)
    assert store.last_snapshot("demopaliva").status == "error"
    assert store.last_snapshot("demopaliva", ok_only=True).fetched_at == collected.fetched_at
    assert len(store.latest_records(["demopaliva"])) == 14


def test_robots_disallow_stops_before_the_feed(fetch):
    fetch.pages[ROBOTS_URL] = (200, b"User-agent: *\nDisallow: /heureka/\n")
    (result,) = collect_all(fetch=fetch)
    assert result.status == "blocked_by_robots"
    assert fetch.requested == [ROBOTS_URL]


def test_unreachable_robots_counts_as_disallow(fetch):
    fetch.pages[ROBOTS_URL] = (503, b"")
    (result,) = collect_all(fetch=fetch)
    assert result.status == "blocked_by_robots"
    assert FEED_URL not in fetch.requested


def test_missing_robots_allows_collection(fetch):
    del fetch.pages[ROBOTS_URL]  # the fake answers 404
    (result,) = collect_all(fetch=fetch)
    assert result.status == "ok"


def test_network_failure_is_recorded(fetch):
    def broken(url):
        if url == FEED_URL:
            raise FetchError("ConnectTimeout")
        return fetch(url)

    (result,) = collect_all(fetch=broken)
    assert (result.status, result.detail) == ("error", "feed: ConnectTimeout")


def test_html_error_page_with_status_200_is_not_stored_as_data(fetch):
    fetch.pages[FEED_URL] = (200, b"<html><body>Access denied</body></html>")
    (result,) = collect_all(fetch=fetch)
    assert result.status == "error"
    assert Store(get_settings().db_path).latest_records(["demopaliva"]) == []


def test_recently_collected_source_is_skipped(collected, fetch, monkeypatch):
    monkeypatch.setenv("COLLECT_MIN_INTERVAL_S", "3600")
    settings = get_settings()
    (source,) = [s for s in load_sources() if s.enabled]
    store = Store(settings.db_path)
    requests_before = len(fetch.requested)

    result = collect_source(source, store, fetch, settings)
    assert result.status == "skipped_recent"
    assert len(fetch.requested) == requests_before

    later = datetime.now(timezone.utc) + timedelta(hours=2)
    assert collect_source(source, store, fetch, settings, now=later).status == "ok"


def test_disabled_and_unknown_sources_are_refused(fetch):
    (result,) = collect_all(["blocked"], fetch=fetch)
    assert (result.status, result.detail) == ("error", "source is disabled in the registry")
    assert fetch.requested == []
    with pytest.raises(KeyError, match="unknown source ids"):
        collect_all(["nope"], fetch=fetch)


def test_packaged_registry_is_valid(monkeypatch):
    monkeypatch.delenv("SOURCES_FILE")
    sources = load_sources()
    assert Counter(source.kind.value for source in sources if source.enabled) == {
        "heureka_feed": 5,
        "shoptet_html": 5,
        "static_html": 12,
    }
    assert Counter(source.pillar for source in sources) == {1: 10, 2: 8, 4: 4}
    assert all(source.entry_url.startswith("https://") for source in sources)


def test_registry_rejects_a_feed_source_without_a_feed_path(data_dir):
    registry = data_dir.parent / "sources.yaml"
    registry.write_text(
        "sources:\n  - id: x\n    seller: X\n    base_url: https://x.example\n"
        "    kind: heureka_feed\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="needs feed_path"):
        load_sources()
