"""Test setup: no real LLM, and the tools service runs in-process.

The app talks to the tools service only over HTTP. Here that HTTP goes to the
real ``podpalto_tools`` FastAPI app through Starlette's TestClient, so these
tests also check the contract between the two services.
"""

import os

os.environ.setdefault("MODEL", "anthropic/claude-opus-5-5")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("CREWAI_TRACING_ENABLED", "false")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from podpalto_app.remote_tools import ToolsClient, set_tools_client  # noqa: E402
from podpalto_tools.api import app as tools_app  # noqa: E402


@pytest.fixture(autouse=True)
def tools_client():
    client = ToolsClient(http_client=TestClient(tools_app))
    set_tools_client(client)
    yield client
    set_tools_client(None)
