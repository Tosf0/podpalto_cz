"""Worker loop: takes runs from the Supabase queues, runs the flow, writes progress and result.

Two queues, both in Supabase (the frontend never calls this service over HTTP):

* ``agent_job_runs`` – scheduled and manual jobs from the admin page (``collect``,
  ``market_report``). ``claim_agent_job`` also creates the scheduled runs that are due, so
  the worker needs no cron of its own. The end is ``finish_agent_job_run``; after a
  successful ``collect`` it refreshes the monthly market stats.
* ``analysis_runs`` – CI Studio analyses ordered by Pro users (``url``, ``market``,
  ``seller``), taken with ``claim_analysis_run``.

Contract: ``frontend/README.md`` (5.2 and 5.3) and ``docs/TODO.md`` („Napojení agentů“).
"""

from __future__ import annotations

import logging
import signal
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from podpalto_app.worker.supabase import SupabaseClient, SupabaseError

log = logging.getLogger(__name__)

MAX_LOG_ENTRIES = 300


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class JobResult:
    """What a handler returns: summary for the admin page and the report it created."""

    summary: dict[str, Any] = field(default_factory=dict)
    report_id: str | None = None


class RunContext:
    """Progress, log and heartbeat of one run, written to its row in Supabase.

    Every write also bumps the row's ``updated_at``; ``claim_agent_job`` marks a run that
    has not been updated for 2 hours as failed, so a heartbeat thread writes periodically
    while a long flow (a collection takes ~15 min) runs without reporting.
    """

    def __init__(
        self,
        db: SupabaseClient,
        table: str,
        match: dict[str, Any],
        *,
        heartbeat_s: float = 300,
        steps: list[dict[str, Any]] | None = None,
    ) -> None:
        self.db = db
        self.table = table
        self.match = match
        self.logs: list[dict[str, Any]] = []
        self.steps = steps
        self.current_step = steps[0]["id"] if steps else "job"
        self._progress = 0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._heartbeat_s = heartbeat_s
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------ reporting
    def log(self, message: str, level: str = "info") -> None:
        """Add a CrewLogEntry (level: info | tool | thought | success | error) and save it."""
        getattr(log, "error" if level == "error" else "info")("%s", message)
        with self._lock:
            self.logs.append(
                {"ts": now_iso(), "step": self.current_step, "level": level, "message": message}
            )
            del self.logs[:-MAX_LOG_ENTRIES]
        self.flush()

    def progress(self, value: int, message: str | None = None) -> None:
        with self._lock:
            self._progress = max(0, min(100, int(value)))
        if message:
            self.log(message)
        else:
            self.flush()

    def step(self, step_id: str, status: str) -> None:
        """CI Studio only: set a CrewStep status (pending | running | done | error)."""
        if not self.steps:
            return
        with self._lock:
            for s in self.steps:
                if s["id"] == step_id:
                    s["status"] = status
                    s["started_at" if status == "running" else "finished_at"] = now_iso()
            if status == "running":
                self.current_step = step_id
        self.flush()

    def values(self) -> dict[str, Any]:
        with self._lock:
            values: dict[str, Any] = {"progress": self._progress, "logs": list(self.logs)}
            if self.steps is not None:
                values["steps"] = [dict(s) for s in self.steps]
            return values

    def flush(self) -> None:
        try:
            self.db.update(self.table, self.match, self.values())
        except SupabaseError as exc:  # progress is best effort; the run goes on
            log.warning("could not save progress: %s", exc)

    # ------------------------------------------------------------------ heartbeat
    def start(self) -> RunContext:
        def beat() -> None:
            while not self._stop.wait(self._heartbeat_s):
                self.flush()

        self._thread = threading.Thread(target=beat, name="heartbeat", daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()


Handler = Callable[[dict[str, Any], RunContext, SupabaseClient], JobResult]

# Steps CI Studio shows for a run (types CrewStep in frontend/src/types/index.ts).
ANALYSIS_STEPS: list[dict[str, Any]] = [
    {"id": "validate_input", "method": "validate_input", "label": "Kontrola zadání"},
    {
        "id": "run_research.market_analyst",
        "method": "run_research",
        "label": "Analýza agentů",
        "agent": "market_analyst",
    },
    {"id": "save_report", "method": "save_report", "label": "Uložení reportu"},
]


class Worker:
    def __init__(
        self,
        db: SupabaseClient,
        worker_id: str,
        *,
        job_handlers: dict[str, Handler],
        analysis_handlers: dict[str, Handler],
        poll_s: float = 30,
        heartbeat_s: float = 300,
    ) -> None:
        self.db = db
        self.worker_id = worker_id
        self.job_handlers = job_handlers
        self.analysis_handlers = analysis_handlers
        self.poll_s = poll_s
        self.heartbeat_s = heartbeat_s
        self._stopping = False

    # ------------------------------------------------------------------ loop
    def run_forever(self) -> None:
        """Poll both queues until SIGTERM / Ctrl+C. Railway sends SIGTERM on every deploy."""

        def on_signal(signum: int, _frame: Any) -> None:
            log.info("signal %s received, stopping", signum)
            self._stopping = True
            raise SystemExit(0)  # interrupts a running flow; the run is marked failed

        signal.signal(signal.SIGTERM, on_signal)
        log.info("worker %s started, polling every %ss", self.worker_id, self.poll_s)
        while not self._stopping:
            try:
                busy = self.run_once()
            except SupabaseError as exc:
                log.error("queue not reachable: %s", exc)
                busy = False
            if not busy:
                time.sleep(self.poll_s)

    def run_once(self) -> bool:
        """Take and process at most one run; False when both queues are empty."""
        job = next(iter(self.db.rpc("claim_agent_job", {"p_worker": self.worker_id}) or []), None)
        if job:
            self.process_job(job)
            return True
        run = next(iter(self.db.rpc("claim_analysis_run", {"worker": self.worker_id}) or []), None)
        if run:
            self.process_analysis(run)
            return True
        return False

    # ------------------------------------------------------------------ agent jobs
    def process_job(self, run: dict[str, Any]) -> None:
        ctx = RunContext(self.db, "agent_job_runs", {"id": run["id"]}, heartbeat_s=self.heartbeat_s)
        ctx.start()
        log.info("job %s (%s) started", run["job"], run["id"])
        status, summary, error = "failed", {}, None
        try:
            handler = self.job_handlers.get(run["job"])
            if handler is None:
                raise NotImplementedError(f"Worker neumí job „{run['job']}“.")
            result = handler(run, ctx, self.db)
            summary = dict(result.summary)
            if result.report_id:
                summary["report_id"] = result.report_id
            status = "completed"
            ctx.log("Hotovo", level="success")
        except BaseException as exc:  # SystemExit too: a restart must not leave it running
            error = _error_text(exc)
            ctx.log(error, level="error")
            if not isinstance(exc, Exception):
                self._finish_job(run, "failed", summary, error)
                raise
        finally:
            ctx.stop()
        self._finish_job(run, status, summary, error)

    def _finish_job(
        self, run: dict[str, Any], status: str, summary: dict[str, Any], error: str | None
    ) -> None:
        try:
            self.db.rpc(
                "finish_agent_job_run",
                {"p_id": run["id"], "p_status": status, "p_summary": summary, "p_error": error},
            )
            log.info("job %s (%s) %s", run["job"], run["id"], status)
        except SupabaseError as exc:
            log.error("could not finish job run %s: %s", run["id"], exc)

    # ------------------------------------------------------------------ CI Studio analyses
    def process_analysis(self, run: dict[str, Any]) -> None:
        steps = [dict(s, status="pending") for s in ANALYSIS_STEPS]
        match = {"run_id": run["run_id"]}
        ctx = RunContext(self.db, "analysis_runs", match, heartbeat_s=self.heartbeat_s, steps=steps)
        ctx.start()
        log.info("analysis %s (%s) started", run.get("kind"), run["run_id"])
        try:
            handler = self.analysis_handlers.get(run.get("kind") or "url")
            if handler is None:
                raise NotImplementedError(f"Worker neumí analýzu typu „{run.get('kind')}“.")
            result = handler(run, ctx, self.db)
            self._finish_analysis(ctx, match, "completed", report_id=result.report_id)
        except BaseException as exc:
            error = _error_text(exc)
            ctx.log(error, level="error")
            ctx.step(ctx.current_step, "error")
            self._finish_analysis(ctx, match, "failed", error=error)
            if not isinstance(exc, Exception):
                raise
        finally:
            ctx.stop()

    def _finish_analysis(
        self,
        ctx: RunContext,
        match: dict[str, Any],
        status: str,
        *,
        report_id: str | None = None,
        error: str | None = None,
    ) -> None:
        values = ctx.values() | {"status": status, "finished_at": now_iso(), "error": error}
        if status == "completed":
            values |= {"progress": 100, "report_id": report_id}
        try:
            self.db.update("analysis_runs", match, values)
        except SupabaseError as exc:
            log.error("could not finish analysis run %s: %s", match, exc)


def _error_text(exc: BaseException) -> str:
    if isinstance(exc, SystemExit):
        return "Worker se ukončil (restart nebo nové nasazení) – spusťte znovu."
    text = str(exc) or type(exc).__name__
    return text[:2000]
