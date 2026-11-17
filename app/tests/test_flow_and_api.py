"""Flow and API tests with the crew replaced by a stub (no LLM calls)."""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from podpalto_app.api.app import create_app
from podpalto_app.domain import FuelType
from podpalto_app.flows import MarketResearchState, market_research, run_market_research
from podpalto_app.remote_tools import ToolsServiceError


class StubCrew:
    """Stands in for SolidFuelsCrew: records the inputs and returns a fixed report."""

    inputs: dict = {}

    def crew(self):
        return self

    def kickoff(self, inputs):
        StubCrew.inputs = inputs
        return SimpleNamespace(raw="# Stub report")


@pytest.fixture
def stub_crew(monkeypatch, tmp_path):
    monkeypatch.setattr(market_research, "SolidFuelsCrew", StubCrew)
    monkeypatch.setattr(
        market_research, "settings", SimpleNamespace(output_dir=tmp_path, tools_api_url="test")
    )
    return tmp_path


def test_flow_passes_inputs_and_saves_report(stub_crew):
    state = run_market_research([FuelType.BROWN_COAL, FuelType.WOOD_BRIQUETTES], focus="pricing")
    assert StubCrew.inputs == {
        "fuel_types": "brown_coal, wood_briquettes",
        "region": "CZ",
        "focus": "pricing",
    }
    assert state.report == "# Stub report"
    saved = list(stub_crew.glob("*_brown_coal-wood_briquettes.md"))
    assert [str(path) for path in saved] == [state.report_path]
    assert saved[0].read_text(encoding="utf-8") == "# Stub report"


def test_flow_defaults_to_all_fuel_types(stub_crew):
    run_market_research()
    assert StubCrew.inputs["fuel_types"] == (
        "brown_coal, black_coal, coke, coal_briquettes, wood_pellets, wood_briquettes, firewood"
    )
    assert StubCrew.inputs["focus"] == "none"


def test_flow_fails_fast_when_tools_service_is_down(stub_crew, tools_client, monkeypatch):
    monkeypatch.setattr(tools_client, "is_healthy", lambda: False)
    with pytest.raises(ToolsServiceError, match="not reachable"):
        run_market_research()


def test_api_run_lifecycle():
    def runner(request):
        return MarketResearchState(report="# Report", report_path="outputs/report.md")

    client = TestClient(create_app(runner=runner))
    assert client.get("/health").json() == {"status": "ok", "tools_service": "ok"}

    created = client.post("/runs", json={"fuel_types": ["brown_coal"], "focus": "prices"})
    assert created.status_code == 202
    run_id = created.json()["run_id"]

    # TestClient finishes background tasks before returning the response.
    run = client.get(f"/runs/{run_id}").json()
    assert run["status"] == "completed"
    assert run["report"] == "# Report"
    assert run["request"] == {"fuel_types": ["brown_coal"], "region": "CZ", "focus": "prices"}

    listed = client.get("/runs").json()
    assert [item["run_id"] for item in listed] == [run_id]
    assert "report" not in listed[0]


def test_api_records_failed_run():
    def runner(request):
        raise RuntimeError("LLM quota exceeded")

    client = TestClient(create_app(runner=runner))
    run_id = client.post("/runs", json={}).json()["run_id"]
    run = client.get(f"/runs/{run_id}").json()
    assert run["status"] == "failed"
    assert run["error"] == "LLM quota exceeded"
    assert run["request"]["fuel_types"] == [fuel.value for fuel in FuelType]


def test_api_validation_and_not_found():
    client = TestClient(create_app(runner=lambda request: MarketResearchState()))
    assert client.post("/runs", json={"fuel_types": ["peat"]}).status_code == 422
    assert client.post("/runs", json={"fuel_types": []}).status_code == 422
    assert client.get("/runs/missing").status_code == 404
