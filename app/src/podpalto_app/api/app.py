"""Public HTTP API of the app service (what the frontend talks to).

GET  /health           liveness + reachability of the tools service
POST /runs             start a research run in the background -> 202 + run_id
GET  /runs             list runs, newest first
GET  /runs/{run_id}    status of one run, with the report once completed

Run locally: ``uv run uvicorn podpalto_app.api.app:app --port 8000``
"""

from __future__ import annotations

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request

from podpalto_app.api.runs import Runner, RunStore, default_runner, execute_run
from podpalto_app.api.schemas import Health, RunDetail, RunRequest, RunSummary
from podpalto_app.remote_tools import get_tools_client


def create_app(runner: Runner = default_runner) -> FastAPI:
    app = FastAPI(title="podpalto.cz market intelligence API", version="0.1.0")
    app.state.runs = RunStore()

    @app.get("/health")
    def health() -> Health:
        tools_ok = get_tools_client().is_healthy()
        return Health(status="ok", tools_service="ok" if tools_ok else "unreachable")

    @app.post("/runs", status_code=202)
    def start_run(body: RunRequest, request: Request, background: BackgroundTasks) -> RunSummary:
        store: RunStore = request.app.state.runs
        run = store.create(body)
        # A sync background task runs in the thread pool, so it does not block the API.
        background.add_task(execute_run, store, run.run_id, runner)
        return RunSummary.model_validate(run.model_dump())

    @app.get("/runs")
    def list_runs(request: Request) -> list[RunSummary]:
        return [
            RunSummary.model_validate(run.model_dump()) for run in request.app.state.runs.list()
        ]

    @app.get("/runs/{run_id}")
    def get_run(run_id: str, request: Request) -> RunDetail:
        run = request.app.state.runs.get(run_id)
        if run is None:
            raise HTTPException(status_code=404, detail=f"run {run_id} not found")
        return run

    return app


app = create_app()
