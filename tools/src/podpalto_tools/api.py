"""HTTP API of the tools service.

GET  /health          liveness probe
GET  /tools           catalog: name, description and JSON schema of every tool
POST /tools/{name}    run one tool; the body is the tool's input model

Run locally: ``uv run uvicorn podpalto_tools.api:app --port 8001``
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from podpalto_tools.registry import ToolError, ToolSpec
from podpalto_tools.sources import ALL_TOOLS


class ToolInfo(BaseModel):
    name: str
    description: str
    mock: bool
    input_schema: dict[str, Any]


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


def create_app(tools: Sequence[ToolSpec] = ALL_TOOLS) -> FastAPI:
    names = [spec.name for spec in tools]
    if len(names) != len(set(names)):
        raise ValueError(f"duplicate tool names: {names}")

    app = FastAPI(title="podpalto.cz tools service", version="0.1.0")

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

    return app


app = create_app()
