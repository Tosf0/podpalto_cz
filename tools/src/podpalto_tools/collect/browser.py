"""Rendering pages that need JavaScript (``rendered_html`` sources), with Playwright.

Used only where a page shows its prices after JavaScript runs. It is a plain headless
Chromium with the collector's user agent: no stealth plugins, no solving of challenges,
no retries. robots.txt is checked by the collector before a page is rendered, and a
refusal (401/403/429) is reported like any other.

Setup: ``uv run playwright install chromium`` (the tools Docker image does this).
"""

from __future__ import annotations

from podpalto_tools.collect.collector import Fetch, FetchError, FetchResponse
from podpalto_tools.settings import Settings

SETTLE_MS = 1500
"""Extra wait after the network is idle, for listings that fill in late."""


def browser_render(settings: Settings) -> Fetch:
    """A fetcher that returns the HTML of the page after JavaScript has run."""

    def render(url: str) -> FetchResponse:
        try:
            from playwright.sync_api import Error as PlaywrightError
            from playwright.sync_api import sync_playwright
        except ImportError as exc:  # pragma: no cover - dependency is declared
            raise FetchError("playwright is not installed") from exc
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                try:
                    page = browser.new_page(user_agent=settings.user_agent, locale="cs-CZ")
                    response = page.goto(
                        url, wait_until="networkidle", timeout=settings.http_timeout_s * 1000
                    )
                    status = response.status if response else 0
                    if status == 200:
                        page.wait_for_timeout(SETTLE_MS)
                    html = page.content()
                finally:
                    browser.close()
        except PlaywrightError as exc:
            raise FetchError(f"browser: {exc}".splitlines()[0]) from exc
        return FetchResponse(status, html.encode("utf-8"))

    return render
