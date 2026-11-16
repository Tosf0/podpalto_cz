"""Run registry and background execution of research flows.

Runs are kept in memory: they are lost on restart and not shared between
worker processes. Swap ``RunStore`` for a database-backed one when needed.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4

from podpalto_app.api.schemas import RunDetail, RunRequest, RunStatus
from podpalto_app.flows import MarketResearchState, run_market_research

logger = logging.getLogger(__name__)

Runner = Callable[[RunRequest], MarketResearchState]


def _now() -> datetime:
    return datetime.now(timezone.utc)


class RunStore:
    def __init__(self) -> None:
        self._runs: dict[str, RunDetail] = {}
        self._lock = Lock()

    def create(self, request: RunRequest) -> RunDetail:
        run = RunDetail(
            run_id=uuid4().hex, status=RunStatus.QUEUED, request=request, created_at=_now()
        )
        with self._lock:
            self._runs[run.run_id] = run
        return run

    def get(self, run_id: str) -> RunDetail | None:
        with self._lock:
            return self._runs.get(run_id)

    def list(self) -> list[RunDetail]:
        with self._lock:
            return sorted(self._runs.values(), key=lambda run: run.created_at, reverse=True)

    def update(self, run_id: str, **changes: Any) -> RunDetail:
        with self._lock:
            run = self._runs[run_id].model_copy(update=changes)
            self._runs[run_id] = run
            return run


def default_runner(request: RunRequest) -> MarketResearchState:
    return run_market_research(request.fuel_types, region=request.region, focus=request.focus)


def execute_run(store: RunStore, run_id: str, runner: Runner) -> None:
    """Run one flow to completion and record the outcome. Never raises."""
    run = store.update(run_id, status=RunStatus.RUNNING, started_at=_now())
    try:
        state = runner(run.request)
    except Exception as exc:
        logger.exception("run %s failed", run_id)
        store.update(run_id, status=RunStatus.FAILED, finished_at=_now(), error=str(exc))
        return
    store.update(
        run_id,
        status=RunStatus.COMPLETED,
        finished_at=_now(),
        report=state.report,
        report_path=state.report_path,
    )
