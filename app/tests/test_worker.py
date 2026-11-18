"""Queue worker: claiming, progress, finishing and failures – without CrewAI and network."""

from __future__ import annotations

from typing import Any

from podpalto_app.worker.handlers import ANALYSIS_HANDLERS
from podpalto_app.worker.runner import JobResult, RunContext, Worker
from podpalto_app.worker.supabase import SupabaseClient


class FakeDb:
    """Records every call; ``claims`` maps an RPC name to the rows it returns once."""

    def __init__(self, claims: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.claims = claims or {}
        self.rpcs: list[tuple[str, dict[str, Any]]] = []
        self.updates: list[tuple[str, dict[str, Any], dict[str, Any]]] = []

    def rpc(self, function: str, params: dict[str, Any] | None = None) -> Any:
        self.rpcs.append((function, params or {}))
        return self.claims.pop(function, [])

    def update(self, table: str, match: dict[str, Any], values: dict[str, Any]) -> None:
        self.updates.append((table, match, values))

    def insert(self, table: str, rows: Any, *, on_conflict: str | None = None) -> list[Any]:
        return [rows]

    def select(self, table: str, query: str) -> list[dict[str, Any]]:
        return []


def make_worker(db: FakeDb, **handlers: Any) -> Worker:
    return Worker(
        db,  # type: ignore[arg-type]
        "test-worker",
        job_handlers=handlers,
        analysis_handlers=ANALYSIS_HANDLERS,
        heartbeat_s=3600,
    )


def finish_call(db: FakeDb) -> dict[str, Any]:
    return next(params for name, params in db.rpcs if name == "finish_agent_job_run")


def test_empty_queues_return_false() -> None:
    db = FakeDb()
    assert make_worker(db).run_once() is False
    assert [name for name, _ in db.rpcs] == ["claim_agent_job", "claim_analysis_run"]


def test_job_success_reports_progress_and_finishes() -> None:
    def collect(run: dict[str, Any], ctx: RunContext, db: Any) -> JobResult:
        ctx.progress(50, "half way")
        return JobResult(summary={"observations": 3}, report_id="r1")

    db = FakeDb({"claim_agent_job": [{"id": "run-1", "job": "collect", "params": {}}]})
    assert make_worker(db, collect=collect).run_once() is True

    finish = finish_call(db)
    assert finish["p_status"] == "completed"
    assert finish["p_summary"] == {"observations": 3, "report_id": "r1"}
    progress = [v for table, _, v in db.updates if table == "agent_job_runs"]
    assert any(v["progress"] == 50 for v in progress)
    assert any(entry["message"] == "half way" for entry in progress[-1]["logs"])


def test_job_failure_is_recorded() -> None:
    def collect(run: dict[str, Any], ctx: RunContext, db: Any) -> JobResult:
        raise RuntimeError("tools service is down")

    db = FakeDb({"claim_agent_job": [{"id": "run-2", "job": "collect"}]})
    make_worker(db, collect=collect).run_once()
    finish = finish_call(db)
    assert finish["p_status"] == "failed"
    assert finish["p_error"] == "tools service is down"


def test_unknown_job_fails_instead_of_hanging() -> None:
    db = FakeDb({"claim_agent_job": [{"id": "run-3", "job": "something_new"}]})
    make_worker(db).run_once()
    assert finish_call(db)["p_status"] == "failed"


def test_analysis_kind_not_ready_fails_with_message() -> None:
    db = FakeDb({"claim_analysis_run": [{"run_id": "a-1", "kind": "url"}]})
    assert make_worker(db).run_once() is True
    table, match, values = db.updates[-1]
    assert (table, match, values["status"]) == ("analysis_runs", {"run_id": "a-1"}, "failed")
    assert "URL" in values["error"]
    assert {s["id"] for s in values["steps"]} >= {"validate_input", "save_report"}


def test_secret_key_headers() -> None:
    new = SupabaseClient("https://x.supabase.co", "sb_secret_abc")
    assert "Authorization" not in new.headers and new.headers["apikey"] == "sb_secret_abc"
    legacy = SupabaseClient("https://x.supabase.co/", "eyJhbGciOi.legacy")
    assert legacy.headers["Authorization"] == "Bearer eyJhbGciOi.legacy"
    assert legacy.base == "https://x.supabase.co/rest/v1"
