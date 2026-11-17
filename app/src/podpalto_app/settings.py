"""Runtime configuration read from the environment (and .env when run locally)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))


@dataclass(frozen=True)
class Settings:
    tools_api_url: str
    tools_api_timeout_s: float
    collect_timeout_s: float
    """Timeout of one collection step; a Shoptet shop read page by page takes minutes."""
    output_dir: Path


settings = Settings(
    tools_api_url=os.getenv("TOOLS_API_URL", "http://localhost:8001"),
    tools_api_timeout_s=float(os.getenv("TOOLS_API_TIMEOUT_S", "30")),
    collect_timeout_s=float(os.getenv("COLLECT_TIMEOUT_S", "900")),
    output_dir=Path(os.getenv("OUTPUT_DIR", "outputs")),
)
