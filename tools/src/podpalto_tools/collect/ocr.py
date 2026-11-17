"""Reading price lists published as images (``image_ocr`` sources), with Tesseract OCR.

The OCR text takes the place of the page text: the extraction crew quotes it and the
usual check verifies every quote against it. Records read this way carry the flag
``read_by_ocr``, because that check cannot catch a digit the OCR itself misread.

Tesseract reads running text well but loses ruled tables, so tables get their own pass:

1. the ruling lines are found from dark-pixel profiles (rows and columns that are mostly
   dark), which splits the table into cells;
2. every cell is read twice as one line of text, with two different thresholds;
3. a cell is kept only when both readings agree (at least in their digits), otherwise it
   becomes "?" and no price can be quoted from it. A missing price beats a wrong one.

The page text is the full-page OCR followed by the table, one row per line, cells
separated by " | ".

This is the interim choice (see docs/TODO.md); a double transcription by a multimodal LLM
with a deterministic comparison is the alternative.

Setup: Tesseract with Czech data (``tesseract-ocr`` + ``tesseract-ocr-ces`` on Debian;
the UB Mannheim build plus ces.traineddata on Windows). TESSERACT_CMD and TESSDATA_DIR
point to them when they are not on the default paths.
"""

from __future__ import annotations

import io
import os
import re
from collections.abc import Callable

from podpalto_tools.settings import Settings

Ocr = Callable[[bytes], str]

DARK = 100
"""Grey level below which a pixel counts as ink or a ruling line."""
LINE_SHARE_ROW = 0.45
"""A pixel row is a horizontal rule when this share of the image width is dark."""
LINE_SHARE_COLUMN = 0.6
"""A pixel column is a vertical rule when this share of the table height is dark."""
CELL_SCALE = 3
CELL_READINGS = ((100, False), (160, True))
"""(threshold, blur) of the two independent readings of every cell."""
UNREADABLE = "?"

_GAP = re.compile(r" {3,}")


class OcrError(Exception):
    """The image could not be read."""


def _runs(flags: list[bool]) -> list[int]:
    """Centre positions of consecutive runs of True."""
    centres, start = [], None
    for index, flag in enumerate([*flags, False]):
        if flag and start is None:
            start = index
        elif not flag and start is not None:
            centres.append((start + index - 1) // 2)
            start = None
    return centres


def find_grid(gray) -> tuple[list[int], list[int]]:
    """y positions of the horizontal and x positions of the vertical table rules."""
    width, height = gray.size
    ink = [1 if value < DARK else 0 for value in gray.getdata()]
    rows = _runs([sum(ink[y * width : (y + 1) * width]) > LINE_SHARE_ROW * width
                  for y in range(height)])  # fmt: skip
    if len(rows) < 2:
        return [], []
    top, bottom = rows[0], rows[-1]
    span = bottom - top
    columns = _runs([sum(ink[y * width + x] for y in range(top, bottom)) > LINE_SHARE_COLUMN * span
                     for x in range(width)])  # fmt: skip
    return rows, columns


def _digits(text: str) -> str:
    return re.sub(r"\D", "", text)


def tesseract_ocr(settings: Settings) -> Ocr:
    """An OCR function for the collector, configured from the settings."""

    def setup():
        try:
            import pytesseract
            from PIL import Image, ImageFilter, UnidentifiedImageError
        except ImportError as exc:  # pragma: no cover - dependencies are declared
            raise OcrError("pytesseract or Pillow is not installed") from exc
        if settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
        if settings.tessdata_dir:
            # The environment variable, not --tessdata-dir: paths with spaces survive it.
            os.environ["TESSDATA_PREFIX"] = settings.tessdata_dir
        return pytesseract, Image, ImageFilter, UnidentifiedImageError

    def read(content: bytes) -> str:
        pytesseract, Image, ImageFilter, UnidentifiedImageError = setup()

        def tesseract(image, psm: int) -> str:
            try:
                return pytesseract.image_to_string(
                    image, lang="ces", config=f"--psm {psm} -c preserve_interword_spaces=1"
                )
            except (pytesseract.TesseractError, pytesseract.TesseractNotFoundError) as exc:
                raise OcrError(str(exc).strip().splitlines()[0]) from exc

        def read_cell(gray, box) -> str:
            cell = gray.crop(box)
            cell = cell.resize((cell.width * CELL_SCALE, cell.height * CELL_SCALE), Image.LANCZOS)
            readings = []
            for threshold, blur in CELL_READINGS:
                prepared = cell.filter(ImageFilter.GaussianBlur(1)) if blur else cell
                prepared = prepared.point(lambda p, t=threshold: 0 if p < t else 255)
                padded = Image.new("L", (prepared.width + 40, prepared.height + 40), 255)
                padded.paste(prepared, (20, 20))
                readings.append(" ".join(tesseract(padded, psm=7).split()))
            first, second = readings
            if first == second or (_digits(first) and _digits(first) == _digits(second)):
                return first
            return UNREADABLE

        try:
            gray = Image.open(io.BytesIO(content)).convert("L")
        except UnidentifiedImageError as exc:
            raise OcrError("not an image") from exc

        page = [_GAP.sub(" | ", line.strip()) for line in tesseract(gray, psm=6).splitlines()]
        lines = [line for line in page if line.strip(" |")]

        rows, columns = find_grid(gray)
        if len(rows) >= 2 and len(columns) >= 2:
            for top, bottom in zip(rows, rows[1:], strict=False):
                cells = [
                    read_cell(gray, (left + 3, top + 3, right - 3, bottom - 3))
                    for left, right in zip(columns, columns[1:], strict=False)
                    if right - left > 10 and bottom - top > 10
                ]
                if any(cell and cell != UNREADABLE for cell in cells):
                    lines.append(" | ".join(cells))
        return "\n".join(lines)

    return read
