"""HTTP API of the tools service.

GET  /health                         liveness probe
GET  /tools                          catalog: name, description and JSON schema of every tool
POST /tools/{name}                   run one tool; the body is the tool's input model
GET  /sources                        source registry with the last collection of every source
POST /collect                        collect the enabled structured sources (in the background)

Used step by step by the app's CollectionFlow (PDF, section 4.1):

POST /sources/{id}/collect           collect one feed / Shoptet source now (no LLM)
POST /sources/{id}/pages             download a price-list source; returns the page text
POST /sources/{id}/extraction        verify, normalise and store the crew's quoted rows
                                     (?dry_run=true only verifies: the crew's guardrail)
POST /sources/{id}/failure           record that the crew failed on this source

Run locally: ``uv run uvicorn podpalto_tools.api:app --port 8001``
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable, Sequence
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field

from podpalto_tools.collect import (
    CollectResult,
    ExtractionResult,
    PageExtraction,
    PagesResult,
    Snapshot,
    Source,
    Store,
    collect_all,
    fetch_price_pages,
    ingest_extraction,
    load_sources,
)
from podpalto_tools.collect.collector import (
    Fetch,
    collect_source,
    http_fetch,
    record_failure,
    resolve_sources,
)
from podpalto_tools.registry import ToolError, ToolSpec
from podpalto_tools.settings import get_settings
from podpalto_tools.sources import ALL_TOOLS


class ToolInfo(BaseModel):
    name: str
    description: str
    mock: bool
    input_schema: dict[str, Any]


class SourceStatus(BaseModel):
    source: Source
    entry_url: str = Field(..., description="Feed or sitemap the collector starts from")
    last_snapshot: Snapshot | None = Field(None, description="Newest attempt, successful or not")


class CollectRequest(BaseModel):
    source_ids: list[str] | None = Field(None, description="Omit to collect every enabled source")


class CollectStarted(BaseModel):
    status: str = "started"
    source_ids: list[str]
    follow: str = "GET /sources shows the result of every source in last_snapshot"


class FailureReport(BaseModel):
    detail: str = Field(..., max_length=2000, description="What went wrong, for GET /sources")


class ExtractionSubmission(BaseModel):
    pages: list[PageExtraction] = Field(
        ..., description="One extraction per page returned by POST /sources/{id}/pages"
    )


def _endpoint(spec: ToolSpec) -> Callable[[Any], BaseModel]:
    def run_tool(payload):
        try:
            return spec.handler(payload)
        except ToolError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    # FastAPI reads the body and response models from the annotations.
    run_tool.__annotations__ = {"payload": spec.input_model, "return": spec.output_model}
    run_tool.__name__ = spec.name
    return run_tool


def create_app(
    tools: Sequence[ToolSpec] = ALL_TOOLS,
    fetch: Fetch | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> FastAPI:
    """``fetch`` and ``sleep`` replace the collector's HTTP client and pauses (tests)."""
    names = [spec.name for spec in tools]
    if len(names) != len(set(names)):
        raise ValueError(f"duplicate tool names: {names}")

    app = FastAPI(title="podpalto.cz tools service", version="0.2.0")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/tools")
    def list_tools() -> list[ToolInfo]:
        return [
            ToolInfo(
                name=spec.name,
                description=spec.description,
                mock=spec.mock,
                input_schema=spec.input_model.model_json_schema(),
            )
            for spec in tools
        ]

    for spec in tools:
        app.post(
            f"/tools/{spec.name}",
            response_model=spec.output_model,
            summary=spec.name,
            description=spec.description,
            tags=["mock tools" if spec.mock else "tools"],
        )(_endpoint(spec))

    @app.get("/sources", tags=["collection"])
    def list_sources() -> list[SourceStatus]:
        store = Store(get_settings().db_path)
        return [
            SourceStatus(
                source=source,
                entry_url=source.entry_url,
                last_snapshot=store.last_snapshot(source.id),
            )
            for source in load_sources()
        ]

    running = threading.Lock()

    def run_collection(source_ids: list[str]) -> None:
        try:
            collect_all(source_ids, fetch=fetch, sleep=sleep)
        finally:
            running.release()

    @app.post("/collect", tags=["collection"], status_code=202)
    def collect(
        background: BackgroundTasks, request: CollectRequest | None = None
    ) -> CollectStarted:
        """Feeds take seconds, shops read page by page take minutes, so this only starts
        the run. One run at a time; a second request while it is running gets 409."""
        try:
            sources = resolve_sources(request.source_ids if request else None)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc.args[0])) from exc
        if not running.acquire(blocking=False):
            raise HTTPException(status_code=409, detail="a collection is already running")
        source_ids = [source.id for source in sources]
        background.add_task(run_collection, source_ids)
        return CollectStarted(source_ids=source_ids)

    # --- step-by-step endpoints for the app's CollectionFlow ------------------------------

    def enabled_source(source_id: str) -> Source:
        try:
            (source,) = resolve_sources([source_id])
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc.args[0])) from exc
        if not source.enabled:
            raise HTTPException(status_code=409, detail="source is disabled in the registry")
        return source

    def exclusively(work: Callable[[], BaseModel]) -> BaseModel:
        if not running.acquire(blocking=False):
            raise HTTPException(status_code=409, detail="a collection is already running")
        try:
            return work()
        finally:
            running.release()

    @app.post("/sources/{source_id}/collect", tags=["collection"])
    def collect_one(source_id: str) -> CollectResult:
        """Collect one feed or Shoptet source now. Shoptet shops take minutes."""
        source = enabled_source(source_id)
        settings = get_settings()
        return exclusively(
            lambda: collect_source(
                source, Store(settings.db_path), fetch or http_fetch(settings), settings,
                sleep=sleep,
            )
        )  # fmt: skip

    @app.post("/sources/{source_id}/pages", tags=["collection"])
    def price_pages(source_id: str, reuse_stored: bool = False) -> PagesResult:
        """Download a price-list source. Unchanged pages are confirmed without extraction.
        ``reuse_stored=true`` returns the pages of the last successful snapshot from disk,
        so a price list can be extracted again without any request to the seller."""
        source = enabled_source(source_id)
        settings = get_settings()
        return exclusively(
            lambda: fetch_price_pages(
                source, Store(settings.db_path), fetch or http_fetch(settings), settings,
                sleep=sleep, reuse_stored=reuse_stored,
            )
        )  # fmt: skip

    @app.post("/sources/{source_id}/extraction", tags=["collection"])
    def extraction(
        source_id: str, submission: ExtractionSubmission, dry_run: bool = False
    ) -> ExtractionResult:
        """Check every quoted row against the stored page; store the verified ones."""
        source = enabled_source(source_id)
        settings = get_settings()
        result = ingest_extraction(
            source, submission.pages, Store(settings.db_path), settings, dry_run=dry_run
        )
        if result.status == "error":
            raise HTTPException(status_code=422, detail=result.detail)
        return result

    @app.post("/sources/{source_id}/failure", tags=["collection"])
    def failure(source_id: str, report: FailureReport) -> CollectResult:
        """Record a failed step that ran outside this service (the extraction crew)."""
        source = enabled_source(source_id)
        return record_failure(source, Store(get_settings().db_path), report.detail)

    return app


app = create_app()
