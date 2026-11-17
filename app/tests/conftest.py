"""Test setup: no real LLM, no network, and the tools service runs in-process.

The app talks to the tools service only over HTTP. Here that HTTP goes to the
real ``podpalto_tools`` FastAPI app through Starlette's TestClient, so these
tests also check the contract between the two services. The tools service reads
a temporary snapshot database filled from a synthetic feed of a fictional shop,
and serves a synthetic price list of a fictional coal yard.
"""

import os
import tempfile
from pathlib import Path

_DATA = Path(tempfile.mkdtemp(prefix="podpalto-app-tests-"))
_FEED = Path(__file__).parents[2] / "tools" / "tests" / "fixtures" / "heureka_feed.xml"
(_DATA / "sources.yaml").write_text(
    "sources:\n"
    "  - id: demopaliva\n"
    "    seller: DemoPaliva\n"
    "    base_url: https://demopaliva.example\n"
    "    kind: heureka_feed\n"
    "    feed_path: /heureka/export/products.xml\n"
    "  - id: demosklad\n"
    "    seller: DemoSklad\n"
    "    base_url: https://demosklad.example\n"
    "    kind: static_html\n"
    "    pillar: 2\n"
    "    page_paths: [/cenik/]\n"
    "    region: Kraj Vysočina\n"
    "    price_region: Kraj Vysočina\n",
    encoding="utf-8",
)

os.environ.setdefault("MODEL", "anthropic/claude-opus-5-5")
os.environ["MANAGER_MODEL"] = "anthropic/claude-opus-5-5"
os.environ["AGENT_MODEL"] = "anthropic/claude-sonnet-5-5"
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("CREWAI_TRACING_ENABLED", "false")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")
os.environ["TOOLS_DATA_DIR"] = str(_DATA / "data")
os.environ["SOURCES_FILE"] = str(_DATA / "sources.yaml")
os.environ["COLLECT_MIN_INTERVAL_S"] = "0"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from podpalto_app.remote_tools import ToolsClient, set_tools_client  # noqa: E402
from podpalto_tools.api import create_app  # noqa: E402
from podpalto_tools.collect import collect_all  # noqa: E402
from podpalto_tools.collect.collector import FetchResponse  # noqa: E402


def fake_fetch(url: str) -> FetchResponse:
    """robots.txt is missing everywhere; every other URL answers with the fixture feed.
    test_collection_flow.py serves its own price-list page."""
    if url.endswith("/robots.txt"):
        return FetchResponse(404, b"")
    return FetchResponse(200, _FEED.read_bytes())


tools_app = create_app(fetch=fake_fetch, sleep=lambda seconds: None)


@pytest.fixture(scope="session", autouse=True)
def collected_offers():
    results = {result.source_id: result.status for result in collect_all(fetch=fake_fetch)}
    assert results == {"demopaliva": "ok", "demosklad": "needs_extraction"}


@pytest.fixture(autouse=True)
def tools_client():
    client = ToolsClient(http_client=TestClient(tools_app))
    set_tools_client(client)
    yield client
    set_tools_client(None)
