"""Example tool: download a web page and return its visible text."""

from __future__ import annotations

from html.parser import HTMLParser
from urllib.request import Request, urlopen

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

_SKIP_TAGS = {"script", "style", "noscript", "svg", "head"}


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
    url: str = Field(..., description="Full URL of the page to read, including https://")


class PageTextTool(BaseTool):
    name: str = "page_text"
    description: str = (
        "Downloads a web page and returns its visible text (no HTML). "
        "Use it to read a competitor's homepage, product or pricing pages."
    )
    args_schema: type[BaseModel] = PageTextInput
    max_chars: int = 20_000
    timeout_s: float = 20.0

    def _run(self, url: str) -> str:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ci-research-bot)"})
        try:
            with urlopen(request, timeout=self.timeout_s) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                html = response.read().decode(charset, errors="replace")
        except Exception as exc:  # returned to the agent so it can react
            return f"ERROR: could not fetch {url}: {exc}"
        return html_to_text(html)[: self.max_chars]
