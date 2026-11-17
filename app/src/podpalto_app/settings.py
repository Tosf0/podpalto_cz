"""Runtime configuration read from the environment (and .env when run locally)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

# CrewAI asks interactively at the end of a run whether to upload its execution trace
# (20 s timeout). That blocks unattended runs (containers, schedulers), so tracing is off
# unless CREWAI_TRACING_ENABLED is set explicitly.
os.environ.setdefault("CREWAI_TRACING_ENABLED", "false")


@dataclass(frozen=True)
class Settings:
    manager_model: str | None
    """LLM of the manager agent (provider/model). Falls back to MODEL."""
    agent_model: str | None
    """LLM of every other agent: specialists and extraction crew. Falls back to MODEL."""
    tools_api_url: str
    tools_api_timeout_s: float
    collect_timeout_s: float
    """Timeout of one collection step; a Shoptet shop read page by page takes minutes."""
    output_dir: Path


settings = Settings(
    # None = let CrewAI use its own default (it also reads MODEL).
    manager_model=os.getenv("MANAGER_MODEL") or os.getenv("MODEL") or None,
    agent_model=os.getenv("AGENT_MODEL") or os.getenv("MODEL") or None,
    tools_api_url=os.getenv("TOOLS_API_URL", "http://localhost:8001"),
    tools_api_timeout_s=float(os.getenv("TOOLS_API_TIMEOUT_S", "30")),
    collect_timeout_s=float(os.getenv("COLLECT_TIMEOUT_S", "900")),
    output_dir=Path(os.getenv("OUTPUT_DIR", "outputs")),
)
