"""HTTP client for the tools service (the only link between the two containers)."""

from __future__ import annotations

from typing import Any

import httpx

from podpalto_app.settings import settings


class ToolsServiceError(RuntimeError):
    """The tools service is unreachable or answered with an error."""


class ToolsClient:
    def __init__(self, http_client: httpx.Client | None = None) -> None:
        self._http = http_client or httpx.Client(
            base_url=settings.tools_api_url, timeout=settings.tools_api_timeout_s
        )
        self._catalog: dict[str, dict[str, Any]] | None = None

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = self._http.request(method, path, **kwargs)
        except httpx.HTTPError as exc:
            raise ToolsServiceError(
                f"tools service unreachable at {self._http.base_url}: {exc}"
            ) from exc
        if response.status_code >= 400:
            raise ToolsServiceError(
                f"{method} {path} failed with HTTP {response.status_code}: {response.text}"
            )
        return response.json()

    def is_healthy(self) -> bool:
        try:
            return self._request("GET", "/health").get("status") == "ok"
        except ToolsServiceError:
            return False

    def catalog(self) -> dict[str, dict[str, Any]]:
        """Tool name -> {name, description, mock, input_schema}; fetched once per client."""
        if self._catalog is None:
            self._catalog = {tool["name"]: tool for tool in self._request("GET", "/tools")}
        return self._catalog

    def call(self, name: str, arguments: dict[str, Any]) -> Any:
        return self._request("POST", f"/tools/{name}", json=arguments)


_default_client: ToolsClient | None = None


def get_tools_client() -> ToolsClient:
    global _default_client
    if _default_client is None:
        _default_client = ToolsClient()
    return _default_client


def set_tools_client(client: ToolsClient | None) -> None:
    """Override the shared client (tests) or reset it with ``None``."""
    global _default_client
    _default_client = client
