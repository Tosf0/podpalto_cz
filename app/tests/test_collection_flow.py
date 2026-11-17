"""CollectionFlow and ExtractionCrew without an LLM: the crew is a stub, everything else
(routing, the tools service, its verification and storage) is real."""

import json
from itertools import count
from pathlib import Path
from types import SimpleNamespace

import pytest
from crewai import Process
from fastapi.testclient import TestClient
from podpalto_app.crews.extraction_crew import ExtractionCrew
from podpalto_app.domain import ExtractedPriceRow, SellerPriceExtractionList
from podpalto_app.flows import collection
from podpalto_app.flows.collection import make_guardrail, run_collection
from podpalto_app.remote_tools import ToolsClient, ToolsServiceError, set_tools_client
from podpalto_tools.api import create_app
from podpalto_tools.collect.collector import FetchResponse

FEED = (
    Path(__file__).parents[2] / "tools" / "tests" / "fixtures" / "heureka_feed.xml"
).read_bytes()
PRICE_LIST = """<html><body><h1>Ceník uhlí</h1>
<p>Ceny uvedeny včetně 21 % DPH. Platnost: {version}</p>
<table><tr><th>Druh</th><th>Cena</th></tr>
<tr><td>Hnědé uhlí Bílina Ořech 2</td><td>690 Kč/q</td></tr>
<tr><td>Koks ořech 1</td><td>1 150 Kč/q</td></tr></table>
<p>Složení pásem 300 Kč.</p></body></html>"""
_versions = count(1)

GOOD_ROWS = [
    ExtractedPriceRow(product_name="Hnědé uhlí Bílina Ořech 2", price_text="690 Kč/q",
                      original_unit="q", fuel_category="brown_coal", price_includes_vat=True),
    ExtractedPriceRow(product_name="Koks ořech 1", price_text="1 150 Kč/q", original_unit="q",
                      fuel_category="coke", price_includes_vat=True),
    ExtractedPriceRow(product_name="Složení pásem", price_text="300 Kč", original_unit="q",
                      fuel_category="brown_coal", qa_status="rejected",
                      qa_note="unloading fee, not a fuel price"),
]  # fmt: skip
INVENTED_ROW = ExtractedPriceRow(
    product_name="Černé uhlí kostka",
    price_text="980 Kč/q",
    original_unit="q",
    fuel_category="black_coal",
)


class StubExtractionCrew:
    """Stands in for ExtractionCrew: returns fixed rows and runs the guardrail like CrewAI."""

    rows: list[ExtractedPriceRow] = GOOD_ROWS
    fail: bool = False
    calls: list[dict] = []
    guardrail_verdicts: list[bool] = []

    def __init__(self, guardrail=None):
        self.guardrail = guardrail

    def crew(self):
        return self

    def kickoff(self, inputs):
        StubExtractionCrew.calls.append(inputs)
        if StubExtractionCrew.fail:
            raise RuntimeError("LLM quota exceeded")
        result = SellerPriceExtractionList(price_list_found=True, rows=StubExtractionCrew.rows)
        output = SimpleNamespace(pydantic=result, raw=result.model_dump_json())
        ok, _ = self.guardrail(output)
        StubExtractionCrew.guardrail_verdicts.append(ok)
        return output


class Web:
    """The fictional coal yard publishes a new version of its price list for every test."""

    def __init__(self) -> None:
        self.page = PRICE_LIST.format(version=next(_versions)).encode()

    def __call__(self, url: str) -> FetchResponse:
        if url.endswith("/robots.txt"):
            return FetchResponse(404, b"")
        if url.startswith("https://demosklad.example/"):
            return FetchResponse(200, self.page)
        return FetchResponse(200, FEED)


@pytest.fixture
def client(tools_client):
    """A tools service that serves this test's version of the price list."""
    client = ToolsClient(http_client=TestClient(create_app(fetch=Web(), sleep=lambda s: None)))
    set_tools_client(client)
    return client


@pytest.fixture
def stub_crew(monkeypatch, tmp_path, client):
    StubExtractionCrew.rows, StubExtractionCrew.fail = GOOD_ROWS, False
    StubExtractionCrew.calls, StubExtractionCrew.guardrail_verdicts = [], []
    monkeypatch.setattr(collection, "ExtractionCrew", StubExtractionCrew)
    monkeypatch.setattr(
        collection, "settings", SimpleNamespace(output_dir=tmp_path, tools_api_url="test")
    )
    return tmp_path


def by_source(state):
    return {run.source_id: run for run in state.results}


def test_flow_routes_every_source_by_kind(stub_crew, client):
    state = run_collection()
    runs = by_source(state)
    assert (runs["demopaliva"].route, runs["demopaliva"].status) == ("structured", "ok")
    assert runs["demopaliva"].records == 14
    sklad = runs["demosklad"]
    assert (sklad.route, sklad.status, sklad.records, sklad.rejected_rows) == (
        "extraction", "ok", 2, 0,
    )  # fmt: skip

    # The crew got the page text, and the guardrail (a dry run) passed the rows.
    (inputs,) = StubExtractionCrew.calls
    assert inputs["seller"] == "DemoSklad"
    assert "Hnědé uhlí Bílina Ořech 2 | 690 Kč/q" in inputs["page_text"]
    assert "wood_pellets" in inputs["fuel_categories"]
    assert StubExtractionCrew.guardrail_verdicts == [True]

    # The verified prices are now served to the report crew, normalised by code.
    coke = client.call("eshop_catalog", {"fuel_type": "coke", "region": "Kraj Vysočina"})
    assert [(p["seller"], p["unit_price_czk"]) for p in coke["products"]] == [("DemoSklad", 11500)]

    summary = json.loads(Path(state.summary_path).read_text(encoding="utf-8"))
    assert [run["source_id"] for run in summary] == ["demopaliva", "demosklad"]


def test_unchanged_price_list_needs_no_crew(stub_crew):
    assert by_source(run_collection(["demosklad"]))["demosklad"].status == "ok"
    StubExtractionCrew.calls.clear()
    state = run_collection(["demosklad"])
    assert by_source(state)["demosklad"].status == "unchanged"
    assert StubExtractionCrew.calls == []  # no LLM call for a page that did not change


def test_reextract_runs_the_crew_on_stored_pages(stub_crew):
    assert by_source(run_collection(["demosklad"]))["demosklad"].status == "ok"
    StubExtractionCrew.calls.clear()
    # Unchanged pages would normally skip the crew; reextract sends them through again.
    state = run_collection(["demosklad"], reextract=True)
    assert by_source(state)["demosklad"].status == "ok"
    assert len(StubExtractionCrew.calls) == 1


def test_guardrail_sends_the_reasons_back(stub_crew, client):
    (page,) = client.price_pages("demosklad")["pages"]
    check = make_guardrail(client, "demosklad", page["page_id"])
    bad = SellerPriceExtractionList(price_list_found=True, rows=[*GOOD_ROWS, INVENTED_ROW])
    ok, message = check(SimpleNamespace(pydantic=bad, raw=""))
    assert ok is False
    assert "'Černé uhlí kostka'" in message and "is not on the page" in message
    good = SimpleNamespace(
        pydantic=SellerPriceExtractionList(price_list_found=True, rows=GOOD_ROWS), raw=""
    )
    assert check(good) == (True, good)


def test_failed_crew_is_retried_then_recorded(stub_crew, client):
    StubExtractionCrew.fail = True
    run = by_source(run_collection(["demosklad"]))["demosklad"]
    assert run.status == "error" and "LLM quota exceeded" in run.detail
    assert len(StubExtractionCrew.calls) == collection.MAX_CREW_ATTEMPTS
    # The failure is also in the database, so GET /sources shows it.
    snapshot = {row["source"]["id"]: row for row in client.sources()}["demosklad"]["last_snapshot"]
    assert snapshot["status"] == "error" and "LLM quota exceeded" in snapshot["error"]
    # Nothing was stored, so the next run still sees a changed page and tries again.
    StubExtractionCrew.fail = False
    assert by_source(run_collection(["demosklad"]))["demosklad"].status == "ok"


def test_flow_rejects_unknown_sources_and_a_missing_service(stub_crew, client, monkeypatch):
    with pytest.raises(ValueError, match="unknown source ids"):
        run_collection(["nope"])
    monkeypatch.setattr(client, "is_healthy", lambda: False)
    with pytest.raises(ToolsServiceError, match="not reachable"):
        run_collection()


def test_extraction_crew_follows_the_pdf_pipeline():
    def guardrail(output):
        return True, output

    crew = ExtractionCrew(guardrail=guardrail).crew()
    assert crew.process == Process.sequential
    assert [agent.role for agent in crew.agents] == [
        "Price List Data Extractor",
        "Market QA and Anomaly Auditor",
    ]
    extract, audit = crew.tasks
    assert extract.output_pydantic is audit.output_pydantic is SellerPriceExtractionList
    assert audit.guardrail is guardrail and audit.guardrail_max_retries == 3
    assert audit.context == [extract]
    assert all(not agent.tools for agent in crew.agents)  # they read text, they fetch nothing
