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
    tesseract_cmd: str | None = None
    """Path to the tesseract binary when it is not on PATH (image_ocr sources)."""
    tessdata_dir: str | None = None
    """Folder with the Tesseract language data (needs ces.traineddata)."""
    export_snapshot_offset: int = 0
    """Added to snapshot ids in the export. Supabase identifies an exported snapshot by
    (source, snapshot id), so each installation with its own snapshot database needs its own
    range: 0 for the local one of the first import, 1 000 000 on Railway."""

    @property
    def db_path(self) -> Path:
        # prices.sqlite holds SolidFuelPriceRecord rows. The older podpalto.sqlite (offers
        # of the first collector version) is no longer read; collect again to refill.
        return self.data_dir / "prices.sqlite"

    @property
    def raw_dir(self) -> Path:
        return self.data_dir / "raw"


_WINDOWS_TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")


def _tesseract_cmd() -> str | None:
    """TESSERACT_CMD, else the default Windows install; None = tesseract on PATH."""
    if os.getenv("TESSERACT_CMD"):
        return os.getenv("TESSERACT_CMD")
    return str(_WINDOWS_TESSERACT) if _WINDOWS_TESSERACT.is_file() else None


def _tessdata_dir(data_dir: Path) -> str | None:
    """TESSDATA_DIR, else <data dir>/ocr/tessdata when it exists (Czech data on Windows)."""
    if os.getenv("TESSDATA_DIR"):
        return os.getenv("TESSDATA_DIR")
    local = data_dir / "ocr" / "tessdata"
    return str(local.resolve()) if (local / "ces.traineddata").is_file() else None


def get_settings() -> Settings:
    """Read the environment on every call, so tests and containers can override it."""
    sources_file = os.getenv("SOURCES_FILE")
    data_dir = Path(os.getenv("TOOLS_DATA_DIR", "data"))
    return Settings(
        data_dir=data_dir,
        sources_file=Path(sources_file) if sources_file else None,
        user_agent=os.getenv("COLLECTOR_USER_AGENT", DEFAULT_USER_AGENT),
        http_timeout_s=float(os.getenv("COLLECTOR_TIMEOUT_S", "30")),
        min_interval_s=int(os.getenv("COLLECT_MIN_INTERVAL_S", "3600")),
        page_delay_s=float(os.getenv("COLLECT_PAGE_DELAY_S", "1.5")),
        max_pages=int(os.getenv("COLLECT_MAX_PAGES", "150")),
        tesseract_cmd=_tesseract_cmd(),
        tessdata_dir=_tessdata_dir(data_dir),
        export_snapshot_offset=int(os.getenv("EXPORT_SNAPSHOT_OFFSET", "0")),
    )
