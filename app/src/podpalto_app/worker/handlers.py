"""What the worker runs for each job and analysis kind.

Flows are imported lazily, so the worker loop (and its tests) load without CrewAI.
Handlers marked TODO are the parts that still need the flows (see docs/TODO.md).
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any

from podpalto_app.worker.export import export_collection
from podpalto_app.worker.runner import Handler, JobResult, RunContext
from podpalto_app.worker.supabase import SupabaseClient

# Fuel categories of the frontend / database (enum fuel_category) -> FuelType of the flows.
FUELS_BY_CATEGORY: dict[str, list[str]] = {
    "wood": ["firewood"],
    "pellets": ["wood_pellets"],
    "briquettes": ["wood_briquettes", "coal_briquettes"],
    "coal": ["brown_coal", "black_coal", "coke"],
}
CATEGORY_LABELS = {
    "wood": "palivové dřevo",
    "pellets": "pelety",
    "briquettes": "brikety",
    "coal": "uhlí",
}

COLLECTION_FAILED = {"error", "blocked_by_robots", "rejected"}


# ---------------------------------------------------------------------- agent jobs
def run_collect(run: dict[str, Any], ctx: RunContext, db: SupabaseClient) -> JobResult:
    """Job ``collect``: CollectionFlow -> export to Supabase.

    Monthly stats are refreshed by ``finish_agent_job_run`` after a successful run.
    """
    from podpalto_app.flows import run_collection

    params = run.get("params") or {}
    ctx.progress(5, "Spouštím CollectionFlow (všechny povolené zdroje)")
    state = run_collection(params.get("source_ids") or None)

    failed = [r for r in state.results if r.status in COLLECTION_FAILED]
    for r in failed:
        ctx.log(f"{r.source_id}: {r.status} {r.detail}".strip(), level="error")
    summary: dict[str, Any] = {
        "sources": len(state.results),
        "sources_failed": len(failed),
        "records": sum(r.records or 0 for r in state.results),
    }
    ctx.progress(70, f"Sběr hotový: {summary['sources']} zdrojů, {summary['records']} záznamů")

    summary |= export_collection(state, db, job_run_id=run["id"], ctx=ctx)
    return JobResult(summary=summary)


def run_market_report(run: dict[str, Any], ctx: RunContext, db: SupabaseClient) -> JobResult:
    """Job ``market_report``: MarketResearchFlow -> report in the CI Studio archive."""
    params = run.get("params") or {}
    report_id = _market_research(params, ctx, db, requested_by=run.get("requested_by"))
    return JobResult(summary={"report_id": report_id}, report_id=report_id)


# ---------------------------------------------------------------------- CI Studio analyses
def run_market_analysis(run: dict[str, Any], ctx: RunContext, db: SupabaseClient) -> JobResult:
    """Analysis ``market`` ordered in CI Studio (params: fuel_category, region)."""
    report_id = _market_research(run.get("params") or {}, ctx, db, requested_by=run.get("user_id"))
    return JobResult(report_id=report_id)


def not_ready(what: str) -> Handler:
    """Placeholder: the run fails with a clear message instead of waiting in the queue forever."""

    def handler(run: dict[str, Any], ctx: RunContext, db: SupabaseClient) -> JobResult:
        raise NotImplementedError(f"{what} zatím agenti neumí – připravujeme.")

    return handler


# ---------------------------------------------------------------------- shared
def _market_research(
    params: dict[str, Any], ctx: RunContext, db: SupabaseClient, *, requested_by: str | None
) -> str:
    from podpalto_app.domain import FuelType
    from podpalto_app.flows import run_market_research
    from podpalto_app.settings import settings

    ctx.step("validate_input", "running")
    category = params.get("fuel_category") or None
    region_code = params.get("region") or None
    if category and category not in FUELS_BY_CATEGORY:
        raise ValueError(f"Neznámé palivo: {category}")
    fuel_types = [FuelType(f) for f in FUELS_BY_CATEGORY[category]] if category else []
    region_name = "CZ"
    if region_code:
        rows = db.select("regions", f"select=name&code=eq.{region_code}")
        if not rows:
            raise ValueError(f"Neznámý kraj: {region_code}")
        region_name = rows[0]["name"]
    ctx.step("validate_input", "done")

    ctx.step("run_research.market_analyst", "running")
    what = f"{category or 'všechna paliva'}, {region_name}"
    ctx.progress(10, f"Spouštím MarketResearchFlow ({what})")
    started = time.monotonic()
    state = run_market_research(fuel_types, region=region_name, focus=params.get("focus") or "")
    ctx.step("run_research.market_analyst", "done")

    ctx.step("save_report", "running")
    ctx.progress(90, "Ukládám report do archivu")
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    report_id = f"market-{stamp}-{category or 'all'}-{(region_code or 'cz').lower()}"
    title = f"Přehled trhu – {CATEGORY_LABELS.get(category or '', 'všechna paliva')} – " + (
        region_name if region_code else "Česko"
    )
    db.insert(
        "analysis_reports",
        {
            "id": report_id,
            "kind": "market",
            "params": {"fuel_category": category, "region": region_code},
            "competitor_url": "",
            "competitor_name": title,
            "competitor_domain": "",
            "report": state.report,
            "report_path": state.report_path or None,
            "status": "completed",
            "model": settings.manager_model,
            "duration_s": round(time.monotonic() - started, 1),
            "region": region_code,
            "categories": [category] if category else None,
            "requested_by": requested_by,
        },
    )
    ctx.step("save_report", "done")
    return report_id


JOB_HANDLERS: dict[str, Handler] = {
    "collect": run_collect,
    "market_report": run_market_report,
}

ANALYSIS_HANDLERS: dict[str, Handler] = {
    "market": run_market_analysis,
    # TODO(app): analýza webu konkurence podle URL (formulář v CI Studiu) – flow zatím není.
    "url": not_ready("Analýzu webu podle URL"),
    # TODO(app): SellerProfileFlow -> analysis_reports (kind seller) + upsert seller_intel.
    "seller": not_ready("Profil prodejce"),
}
