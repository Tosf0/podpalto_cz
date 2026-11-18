"""Minimal Supabase (PostgREST) client for the worker: RPC calls, inserts and updates.

Standard library only (urllib), so the worker adds no dependency to the lockfile. It uses the
project's *secret* key (service role): it bypasses row level security, so it lives only in the
worker's environment (Railway variables, local .env), never in the frontend or the repository.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


class SupabaseError(RuntimeError):
    """A request to Supabase failed (HTTP error or unreachable)."""


class SupabaseClient:
    def __init__(self, url: str, secret_key: str, timeout_s: float = 30.0) -> None:
        if not url or not secret_key:
            raise SupabaseError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set for the worker")
        self.base = url.rstrip("/") + "/rest/v1"
        self.timeout_s = timeout_s
        self.headers = {"apikey": secret_key, "Content-Type": "application/json"}
        # Legacy service_role keys are JWTs and also go into Authorization; the new
        # sb_secret_… keys must be sent in the apikey header only.
        if secret_key.startswith("eyJ"):
            self.headers["Authorization"] = f"Bearer {secret_key}"

    def _request(
        self, method: str, path: str, body: Any = None, *, prefer: str | None = None
    ) -> Any:
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        data = None if body is None else json.dumps(body, default=str).encode("utf-8")
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as res:
                raw = res.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            raise SupabaseError(f"{method} {path}: HTTP {exc.code} {detail}") from exc
        except urllib.error.URLError as exc:
            raise SupabaseError(f"{method} {path}: {exc.reason}") from exc
        return json.loads(raw) if raw else None

    def rpc(self, function: str, params: dict[str, Any] | None = None) -> Any:
        """``select function(params)``; a set-returning function gives a list of rows."""
        return self._request("POST", f"/rpc/{function}", params or {})

    def insert(
        self,
        table: str,
        rows: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str | None = None,
    ) -> list[dict[str, Any]]:
        """Insert rows (upsert when ``on_conflict`` names the unique columns) and return them."""
        path = f"/{table}"
        prefer = "return=representation"
        if on_conflict:
            path += "?on_conflict=" + urllib.parse.quote(on_conflict)
            prefer += ",resolution=merge-duplicates"
        return self._request("POST", path, rows, prefer=prefer) or []

    def update(self, table: str, match: dict[str, Any], values: dict[str, Any]) -> None:
        """``update table set values where column = value`` for every pair in ``match``."""
        query = "&".join(f"{k}=eq.{urllib.parse.quote(str(v))}" for k, v in match.items())
        self._request("PATCH", f"/{table}?{query}", values, prefer="return=minimal")

    def update_where(self, table: str, query: str, values: dict[str, Any]) -> list[dict[str, Any]]:
        """``update table set values`` for the rows a raw PostgREST filter selects; returns
        the updated rows (e.g. ``"seller_id=eq.…&active=is.true"``)."""
        return (
            self._request("PATCH", f"/{table}?{query}", values, prefer="return=representation")
            or []
        )

    def select(self, table: str, query: str) -> list[dict[str, Any]]:
        """Raw PostgREST query string, e.g. ``select("regions", "select=name&code=eq.STC")``."""
        return self._request("GET", f"/{table}?{query}") or []
