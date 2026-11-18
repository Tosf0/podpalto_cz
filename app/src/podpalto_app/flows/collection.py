"""CollectionFlow: the deterministic outer layer of the source report (PDF, section 4.1).

    @start   load_sources       registry from the tools service
    @router  next_source        one source at a time, routed by its kind:
               structured  ->   collect_structured   feed / Shoptet pages, no LLM
               extraction  ->   extract_price_list   pages -> ExtractionCrew -> verification
               unsupported ->   skip_unsupported
             ... back to next_source until the queue is empty
    @listen  save_summary       one JSON summary per run in OUTPUT_DIR

Fetching, robots.txt, pacing, verification and all arithmetic stay in the tools service.
The flow only decides what runs next, retries a failed crew run (LLM errors) and logs;
it never retries a request a site refused.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from datetime import datetime
from typing import Any

from crewai.flow.flow import Flow, listen, or_, router, start
from pydantic import BaseModel, Field, ValidationError

from podpalto_app.crews.extraction_crew import ExtractionCrew
from podpalto_app.domain import ALL_FUEL_TYPES, SellerPriceExtractionList
from podpalto_app.remote_tools import ToolsClient, ToolsServiceError, get_tools_client
from podpalto_app.settings import settings

log = logging.getLogger(__name__)

STRUCTURED_KINDS = {"heureka_feed", "shoptet_html"}
EXTRACTION_KINDS = {"static_html", "rendered_html", "image_ocr"}
MAX_CREW_ATTEMPTS = 2


class SourceRun(BaseModel):
    source_id: str
    kind: str
    route: str
    status: str
    detail: str = ""
    records: int | None = None
    rejected_rows: int | None = None


class FuelPipelineState(BaseModel):
    only: list[str] = Field(default_factory=list, description="Source ids; empty = all enabled")
    reextract: bool = Field(
        False, description="Price lists: extract the stored pages again, download nothing"
    )
    queue: list[dict[str, Any]] = Field(default_factory=list)
    total: int = Field(0, description="Sources to collect in this run")
    current: dict[str, Any] | None = None
    results: list[SourceRun] = Field(default_factory=list)
    summary_path: str = ""


def as_extraction(output: Any) -> SellerPriceExtractionList:
    """The crew's (or a task's) output as a SellerPriceExtractionList."""
    if isinstance(getattr(output, "pydantic", None), SellerPriceExtractionList):
        return output.pydantic
    return SellerPriceExtractionList.model_validate_json(output.raw)


def make_guardrail(client: ToolsClient, source_id: str, page_id: str):
    """Guardrail of the audit task: a dry run of the tools service's verification."""

    def check_rows_against_page(output):
        try:
            extraction = as_extraction(output)
        except ValidationError as exc:
            return False, f"The output is not a valid SellerPriceExtractionList: {exc}"
        page = {"page_id": page_id, "extraction": extraction.model_dump(mode="json")}
        try:
            result = client.submit_extraction(source_id, [page], dry_run=True)
        except ToolsServiceError as exc:
            # The same check runs again when the rows are stored; do not burn retries.
            log.warning("guardrail could not reach the tools service: %s", exc)
            return True, output
        failed = [verdict for verdict in result["verdicts"] if not verdict["accepted"]]
        if not failed:
            return True, output
        lines = [f"- row {v['product_name']!r}: {'; '.join(v['reasons'])}" for v in failed]
        return False, (
            "These accepted rows failed the check against the page. Copy the text exactly "
            "from the page, or set qa_status to 'rejected' with a qa_note when a row "
            "cannot be fixed:\n" + "\n".join(lines)
        )

    return check_rows_against_page


SourceDone = Callable[[SourceRun, int, int], None]
"""Called after each source with (its result, sources done, sources in this run)."""


class CollectionFlow(Flow[FuelPipelineState]):
    on_source: SourceDone | None = None

    @property
    def _client(self) -> ToolsClient:
        return get_tools_client()

    def _record(self, route: str, status: str, detail: str = "", **counts: int | None) -> None:
        source = self.state.current or {}
        run = SourceRun(
            source_id=source.get("id", "?"), kind=source.get("kind", "?"), route=route,
            status=status, detail=detail, **counts,
        )  # fmt: skip
        log.info("%s %s %s %s", run.source_id, run.route, run.status, run.detail)
        self.state.results.append(run)
        if self.on_source is not None:
            try:  # progress reporting must never stop the collection
                self.on_source(run, len(self.state.results), self.state.total)
            except Exception as exc:
                log.warning("progress callback failed: %s", exc)

    @start()
    def load_sources(self) -> None:
        if not self._client.is_healthy():
            raise ToolsServiceError(
                f"tools service is not reachable at {settings.tools_api_url}; "
                "start it before running the collection flow"
            )
        registry = [row["source"] for row in self._client.sources()]
        known = {source["id"] for source in registry}
        unknown = sorted(set(self.state.only) - known)
        if unknown:
            raise ValueError(f"unknown source ids: {unknown}")
        wanted = set(self.state.only)
        self.state.queue = [
            source
            for source in registry
            if source["enabled"] and (not wanted or source["id"] in wanted)
        ]
        self.state.total = len(self.state.queue)

    @router(or_(load_sources, "source_done"))
    def next_source(self) -> str:
        if not self.state.queue:
            return "finished"
        self.state.current = self.state.queue.pop(0)
        kind = self.state.current["kind"]
        if kind in STRUCTURED_KINDS:
            return "structured"
        if kind in EXTRACTION_KINDS:
            return "extraction"
        return "unsupported"

    @router("structured")
    def collect_structured(self) -> str:
        source_id = self.state.current["id"]
        try:
            result = self._client.collect_source(source_id)
        except ToolsServiceError as exc:
            self._record("structured", "error", str(exc))
        else:
            self._record(
                "structured", result["status"], result.get("detail", ""),
                records=result.get("offers"),
            )  # fmt: skip
        return "source_done"

    @router("extraction")
    def extract_price_list(self) -> str:
        source = self.state.current
        try:
            pages = self._client.price_pages(source["id"], reuse_stored=self.state.reextract)
        except ToolsServiceError as exc:
            self._record("extraction", "error", str(exc))
            return "source_done"
        if pages["status"] != "ok":
            # unchanged, skipped_recent, blocked_by_robots, error: nothing for the crew
            self._record("extraction", pages["status"], pages.get("detail", ""))
            return "source_done"

        extractions = []
        for page in pages["pages"]:
            extraction, error = self._extract_page(source, page)
            if extraction is None:
                detail = f"crew failed on {page['url']}: {error}"
                self._record("extraction", "error", detail)
                try:  # so that GET /sources shows it, like a failed download
                    self._client.report_failure(source["id"], detail)
                except ToolsServiceError as exc:
                    log.warning("could not record the failure: %s", exc)
                return "source_done"
            extractions.append(
                {"page_id": page["page_id"], "extraction": extraction.model_dump(mode="json")}
            )
        try:
            stored = self._client.submit_extraction(source["id"], extractions)
        except ToolsServiceError as exc:
            self._record("extraction", "error", str(exc))
            return "source_done"
        self._record(
            "extraction", stored["status"], stored.get("detail", ""),
            records=stored["accepted"], rejected_rows=stored["rejected"],
        )  # fmt: skip
        return "source_done"

    def _extract_page(
        self, source: dict[str, Any], page: dict[str, Any]
    ) -> tuple[SellerPriceExtractionList | None, str]:
        inputs = {
            "seller": source["seller"],
            "page_url": page["url"],
            "fuel_categories": ", ".join(fuel.value for fuel in ALL_FUEL_TYPES),
            "page_text": page["text"],
        }
        guardrail = make_guardrail(self._client, source["id"], page["page_id"])
        error = ""
        for attempt in range(1, MAX_CREW_ATTEMPTS + 1):
            try:
                # Looked up in this module at call time, so tests can swap in a stub.
                output = ExtractionCrew(guardrail=guardrail).crew().kickoff(inputs=inputs)
                return as_extraction(output), ""
            except Exception as exc:  # LLM, parsing or guardrail exhaustion: retry once
                error = f"{type(exc).__name__}: {exc}"
                log.warning("extraction attempt %d for %s failed: %s", attempt, page["url"], error)
        return None, error

    @router("unsupported")
    def skip_unsupported(self) -> str:
        self._record(
            "none", "skipped", f"no collection route for kind {self.state.current['kind']}"
        )
        return "source_done"

    @listen("finished")
    def save_summary(self) -> str:
        settings.output_dir.mkdir(parents=True, exist_ok=True)
        path = settings.output_dir / f"collection-{datetime.now():%Y%m%d-%H%M%S}.json"
        path.write_text(
            json.dumps([run.model_dump() for run in self.state.results], indent=1),
            encoding="utf-8",
        )
        self.state.summary_path = str(path)
        return self.state.summary_path


def run_collection(
    source_ids: list[str] | None = None,
    *,
    reextract: bool = False,
    on_source: SourceDone | None = None,
) -> FuelPipelineState:
    """Run the collection flow synchronously (CLI and API).

    ``reextract`` sends the stored pages of price lists through the crew again (after the
    extraction rules changed) without downloading anything; other sources are collected
    as usual, so combine it with ``source_ids`` of price lists. ``on_source`` is called
    after each source (the worker turns it into progress on the admin page).
    """
    flow = CollectionFlow()
    flow.on_source = on_source
    flow.kickoff(inputs={"only": source_ids or [], "reextract": reextract})
    return flow.state
