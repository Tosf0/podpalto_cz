"""Request and response models of the app API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from podpalto_app.domain import ALL_FUEL_TYPES, FuelType


class RunRequest(BaseModel):
    fuel_types: list[FuelType] = Field(
        default_factory=lambda: list(ALL_FUEL_TYPES), min_length=1, description="Fuels to research"
    )
    region: str = Field("CZ", min_length=1, max_length=50)
    focus: str = Field("", max_length=500, description="Optional question the report focuses on")


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RunSummary(BaseModel):
    run_id: str
    status: RunStatus
    request: RunRequest
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


class RunDetail(RunSummary):
    report: str | None = Field(None, description="Markdown report, set when status=completed")
    report_path: str | None = None


class Health(BaseModel):
    status: str
    tools_service: str
