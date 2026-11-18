"""One-off: link sellers already in Supabase to the sellers of the export.

The 81 real sellers on the web were written once by Claude subagents, without
``external_key``. The export upserts by ``external_key``, so without this step a seller
read by both would appear twice on the map. Matching is by web domain, then by IČO.

``python -m podpalto_app.worker.link_sellers``           prints the proposal, writes nothing
``python -m podpalto_app.worker.link_sellers --apply``   sets ``external_key`` of the matches

After linking, the next export updates these sellers (address, location, registry) instead
of creating new ones, and sets ``active = false`` on their old products that the source no
longer lists; nothing is deleted. Agree on ``--apply`` with the owner of the web data first.
"""

from __future__ import annotations

import argparse
import os
import re
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from podpalto_app.worker.supabase import SupabaseClient


def domain(url: str | None) -> str | None:
    """'https://www.Palivos.cz/kontakty' -> 'palivos.cz'; 'eshop.drevosrot.cz' stays."""
    if not url:
        return None
    host = re.sub(r"^[a-z]+://", "", url.strip().lower()).split("/")[0].split(":")[0]
    return host.removeprefix("www.") or None


def match_sellers(
    exported: list[dict[str, Any]], existing: list[dict[str, Any]]
) -> list[tuple[dict[str, Any], dict[str, Any] | None, str]]:
    """(exported seller, existing row or None, how it matched) for every exported seller."""
    by_domain: dict[str, list[dict[str, Any]]] = {}
    by_ico: dict[str, list[dict[str, Any]]] = {}
    for row in existing:
        if d := domain(row.get("website")):
            by_domain.setdefault(d, []).append(row)
        if row.get("ico"):
            by_ico.setdefault(row["ico"], []).append(row)
    result = []
    for seller in exported:
        rows = by_domain.get(domain(seller["website"]) or "", [])
        how = "domain"
        if not rows and seller.get("company_ico"):
            rows, how = by_ico.get(seller["company_ico"], []), "ico"
        if len(rows) == 1:
            result.append((seller, rows[0], how))
        elif len(rows) > 1:
            result.append((seller, None, f"ambiguous: {len(rows)} sellers by {how}"))
        else:
            result.append((seller, None, "new"))
    return result


def link(db: SupabaseClient, payload: dict[str, Any], *, apply: bool) -> list[str]:
    from podpalto_app.worker.export import _select_all

    existing = _select_all(db, "sellers", "select=id,slug,name,website,ico,external_key,owner_id")
    lines = []
    for seller, row, how in match_sellers(payload.get("sellers", []), existing):
        key = seller["seller_key"]
        if row is None:
            lines.append(f"{key:16} {how}")
            continue
        if row.get("external_key") == key:
            lines.append(f"{key:16} already linked to {row['slug']}")
            continue
        if row.get("external_key"):
            lines.append(f"{key:16} SKIP: {row['slug']} is linked to {row['external_key']}")
            continue
        owner = (
            " (claimed by its owner: the export will not touch it)" if row.get("owner_id") else ""
        )
        lines.append(f"{key:16} -> {row['slug']} ({row['name']}) by {how}{owner}")
        if apply:
            db.update("sellers", {"id": row["id"]}, {"external_key": key})
    return lines


def main() -> None:
    from podpalto_app.remote_tools.client import get_tools_client
    from podpalto_app.worker.supabase import SupabaseClient

    parser = argparse.ArgumentParser(description="Link existing sellers to exported ones")
    parser.add_argument("--apply", action="store_true", help="write external_key")
    args = parser.parse_args()
    db = SupabaseClient(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SECRET_KEY", ""))
    for line in link(db, get_tools_client().export(), apply=args.apply):
        print(line)
    if not args.apply:
        print("Nothing written; run again with --apply to link the matches.")


if __name__ == "__main__":
    main()
