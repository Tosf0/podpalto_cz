"""Test setup: a temporary data directory, a one-shop registry and a fake HTTP fetcher.

No test touches the network. The feed is a synthetic file of a fictional shop.
"""

from pathlib import Path

import pytest
from podpalto_tools.collect import collect_all
from podpalto_tools.collect.collector import FetchResponse

FEED = (Path(__file__).parent / "fixtures" / "heureka_feed.xml").read_bytes()
ROBOTS = b"User-agent: *\nDisallow: /export/\nSitemap: https://demopaliva.example/sitemap.xml\n"
REGISTRY = """
sources:
  - id: demopaliva
    seller: DemoPaliva
    base_url: https://demopaliva.example
    kind: heureka_feed
    feed_path: /heureka/export/products.xml
  - id: blocked
    seller: BlockedShop
    base_url: https://blocked.example
    kind: heureka_feed
    feed_path: /heureka/export/products.xml
    enabled: false
"""


class FakeFetch:
    """Answers from a dict of URL -> (status, body) and records what was requested."""

    def __init__(self) -> None:
        self.pages = {
            "https://demopaliva.example/robots.txt": (200, ROBOTS),
            "https://demopaliva.example/heureka/export/products.xml": (200, FEED),
        }
        self.requested: list[str] = []

    def __call__(self, url: str) -> FetchResponse:
        self.requested.append(url)
        status, body = self.pages.get(url, (404, b""))
        return FetchResponse(status, body)


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    registry = tmp_path / "sources.yaml"
    registry.write_text(REGISTRY, encoding="utf-8")
    monkeypatch.setenv("TOOLS_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("SOURCES_FILE", str(registry))
    monkeypatch.setenv("COLLECT_MIN_INTERVAL_S", "0")
    return tmp_path / "data"


@pytest.fixture
def fetch():
    return FakeFetch()


@pytest.fixture
def collected(fetch):
    """The fixture feed collected into the snapshot database."""
    (result,) = collect_all(fetch=fetch)
    assert result.status == "ok"
    return result
