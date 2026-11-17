"""Runtime settings of the tools service, read from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# Generic on purpose. For regular operation set COLLECTOR_USER_AGENT to a value that
# lets a shop owner identify and contact the operator.
DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; solid-fuel-price-collector/0.1)"


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    """Where the snapshot database and the raw feed copies live."""
    sources_file: Path | None
    """Source registry to use instead of the packaged ``collect/sources.yaml``."""
    user_agent: str
    http_timeout_s: float
    min_interval_s: int
    """A source collected more recently than this is skipped (0 disables the guard)."""
    page_delay_s: float
    """Pause between two page requests to the same shop (HTML sources)."""
    max_pages: int
    """Upper limit of pages fetched from one shop per run (HTML sources)."""

    @property
    def db_path(self) -> Path:
        # prices.sqlite holds SolidFuelPriceRecord rows. The older podpalto.sqlite (offers
        # of the first collector version) is no longer read; collect again to refill.
        return self.data_dir / "prices.sqlite"

    @property
    def raw_dir(self) -> Path:
        return self.data_dir / "raw"


def get_settings() -> Settings:
    """Read the environment on every call, so tests and containers can override it."""
    sources_file = os.getenv("SOURCES_FILE")
    return Settings(
        data_dir=Path(os.getenv("TOOLS_DATA_DIR", "data")),
        sources_file=Path(sources_file) if sources_file else None,
        user_agent=os.getenv("COLLECTOR_USER_AGENT", DEFAULT_USER_AGENT),
        http_timeout_s=float(os.getenv("COLLECTOR_TIMEOUT_S", "30")),
        min_interval_s=int(os.getenv("COLLECT_MIN_INTERVAL_S", "3600")),
        page_delay_s=float(os.getenv("COLLECT_PAGE_DELAY_S", "1.5")),
        max_pages=int(os.getenv("COLLECT_MAX_PAGES", "150")),
    )
