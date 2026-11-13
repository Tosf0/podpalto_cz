"""Central place for runtime configuration read from the environment / .env."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(REPO_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    model: str = field(default_factory=lambda: os.getenv("MODEL", "anthropic/claude-opus-5-5"))
    competitor_url: str = field(
        default_factory=lambda: os.getenv("COMPETITOR_URL", "https://www.example.com")
    )
    output_dir: Path = REPO_ROOT / "outputs"


settings = Settings()
