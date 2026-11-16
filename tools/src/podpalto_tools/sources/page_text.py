"""REAL source: download a web page and return its visible text."""

from __future__ import annotations

from html.parser import HTMLParser
from urllib.request import Request, urlopen

from pydantic import BaseModel, Field, HttpUrl

from podpalto_tools.registry import ToolError, ToolSpec
from podpalto_tools.schemas import ToolResult

_SKIP_TAGS = {"script", "style", "noscript", "svg", "head"}
_MAX_CHARS = 20_000
_TIMEOUT_S = 20.0


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth and data.strip():
            self.parts.append(data.strip())


def html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return "\n".join(parser.parts)


class PageTextInput(BaseModel):
    url: HttpUrl = Field(..., description="Full http(s) URL of the page to read")


class PageTextOutput(ToolResult):
    url: str
    text: str
    truncated: bool


def run(params: PageTextInput) -> PageTextOutput:
    url = str(params.url)
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ci-research-bot)"})
    try:
        with urlopen(request, timeout=_TIMEOUT_S) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            html = response.read().decode(charset, errors="replace")
    except Exception as exc:
        raise ToolError(f"could not fetch {url}: {exc}") from exc
    text = html_to_text(html)
    return PageTextOutput(
        source=url,
        mock=False,
        url=url,
        text=text[:_MAX_CHARS],
        truncated=len(text) > _MAX_CHARS,
    )


TOOL = ToolSpec(
    name="page_text",
    description=(
        "Downloads a live web page and returns its visible text (no HTML). Use it to "
        "read a specific competitor page when you already know its URL."
    ),
    input_model=PageTextInput,
    output_model=PageTextOutput,
    handler=run,
    mock=False,
)
