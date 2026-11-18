"""Export of a finished collection from the tools service into Supabase.

TODO(app): this is the one piece of the integration that is still missing. Until it is done,
the ``collect`` job fails with the message below, so the admin page shows it clearly and the
prices stay only in the SQLite database of the tools service.

What to do (field mapping in docs/agent-output-spec.md, section 7 and on):

1. Read the records of this collection from the tools service over HTTP. The app does not
   import ``podpalto_tools``, so the tools service needs an endpoint for it, e.g.
   ``GET /export?since=<started_at>`` returning sellers and price records in the shape of
   docs/agent-output-spec.md.
2. Upsert sellers: ``db.insert("sellers", rows, on_conflict="external_key")``.
3. Upsert products: ``db.insert("products", rows, on_conflict="seller_id,external_id")``.
4. Insert prices: ``db.insert("price_observations", rows)`` – always new rows with
   ``observed_at`` = time of download, never update old ones (that is the price history behind
   Trendy). A trigger updates ``products.price_czk`` and ``price_updated_at`` by itself.
5. One ``scrape_runs`` row per source with ``job_run_id`` (links the source to this job run).
6. Return counts for the admin page, e.g. ``{"observations": 371, "products_new": 12,
   "sellers_new": 2}``. ``finish_agent_job_run`` then calls ``refresh_market_stats()``.

Use ``ctx.progress(…, "…")`` / ``ctx.log(…)`` to report progress while exporting.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from podpalto_app.worker.runner import RunContext
    from podpalto_app.worker.supabase import SupabaseClient


def export_collection(
    state: Any, db: SupabaseClient, *, job_run_id: str, ctx: RunContext
) -> dict[str, Any]:
    """Write the collected sellers, products and prices to Supabase; return counts."""
    raise NotImplementedError(
        "Sběr proběhl, ale export do Supabase zatím není hotový "
        "(app/src/podpalto_app/worker/export.py) – ceny jsou jen v SQLite služby tools."
    )
