"""Export of a finished collection from the tools service into Supabase.

The tools service builds the payload (``GET /export``, docs/agent-output-spec.md section 10:
sellers, products, prices and runs, already converted to the web app's categories and
units). This module only writes it, in the order sellers -> products -> price_observations
-> scrape_runs:

* **sellers** by ``external_key`` (= ``seller_key``, the source id). A new seller gets slug,
  name and address; an existing one only the columns the collection owns (address,
  location, IČO, registry, flags), so a name or description edited on the web stays.
  Sellers with an owner (claimed profile) are left alone, with their products and prices.
* **products** by ``(seller_id, external_id)`` (``external_id`` = ``item_id``). The current
  price of an existing product is not touched: the price trigger compares it with the new
  price to decide about review. Products of an exported seller that are not in the source
  any more get ``active = false`` (never deleted).
* **price_observations** always as new rows (the price history behind Trendy).
* **scrape_runs**, one per snapshot, with ``job_run_id``. ``(source_key, snapshot_id)`` is
  unique, so a snapshot exported before is skipped (export twice = no duplicate prices).

After a collect job ``finish_agent_job_run`` refreshes the market statistics. For a manual
import run ``python -m podpalto_app.worker.export`` (``--dry-run`` writes nothing).
"""

from __future__ import annotations

import urllib.parse
from collections import defaultdict
from collections.abc import Iterable
from typing import TYPE_CHECKING, Any, Protocol

if TYPE_CHECKING:
    from podpalto_app.worker.supabase import SupabaseClient

BATCH = 500
PAGE = 1000

# Product fields of the payload that are columns of ``products`` (spec name = column name).
PRODUCT_COLUMNS = (
    "name", "name_raw", "category", "unit", "package_kg", "package_prm", "stock",
    "delivery_days", "source_url", "declared_mj_per_kg", "active", "wood_species",
    "wood_species_raw", "wood_group", "wood_form", "moisture", "moisture_percent",
    "log_length_cm", "log_length_cm_exact", "certification", "diameter_mm", "briquette_type",
    "briquette_material", "coal_type", "coal_origin", "grain_mm", "quality_raw", "flags",
)  # fmt: skip
PRICE_COLUMNS = (
    "price_czk", "observed_at", "source_url", "vat_status", "original_price", "original_unit",
    "original_quantity", "original_price_includes_vat", "valid_in_regions",
    "delivery_included", "normalized", "snapshot_id", "flags",
)  # fmt: skip
RUN_STATUS = {"ok": "success", "error": "failed", "blocked_by_robots": "blocked"}


class Progress(Protocol):
    def log(self, message: str, level: str = "info") -> None: ...
    def progress(self, value: int, message: str | None = None) -> None: ...


class _Quiet:
    def log(self, message: str, level: str = "info") -> None:
        print(f"[{level}] {message}", flush=True)

    def progress(self, value: int, message: str | None = None) -> None:
        if message:
            print(f"[{value:3d} %] {message}", flush=True)


def _in(values: Iterable[str]) -> str:
    """PostgREST ``in.(…)`` with every value quoted, URL-encoded."""
    quoted = ",".join('"' + str(v).replace("\\", "\\\\").replace('"', '\\"') + '"' for v in values)
    return urllib.parse.quote(f"in.({quoted})", safe="")


def _select_all(db: SupabaseClient, table: str, query: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    while True:
        page = db.select(table, f"{query}&order=id&limit={PAGE}&offset={len(rows)}")
        rows += page
        if len(page) < PAGE:
            return rows


def _chunks(rows: list[dict[str, Any]], size: int = BATCH) -> Iterable[list[dict[str, Any]]]:
    for start in range(0, len(rows), size):
        yield rows[start : start + size]


def _slug(seller_key: str, taken: set[str]) -> str:
    base = "-".join(part for part in seller_key.lower().replace("_", "-").split("-") if part)
    slug, number = base, 1
    while slug in taken:
        number += 1
        slug = f"{base}-{number}"
    taken.add(slug)
    return slug


def _seller_columns(seller: dict[str, Any], last_scraped_at: str | None) -> dict[str, Any]:
    """Columns the collection owns; written on every export."""
    address, location = seller["address"], seller.get("location") or {}
    return {
        "ico": seller.get("company_ico"),
        "legal_name": seller.get("legal_name"),
        "website": seller["website"],
        "street": address.get("street") or "",
        "city": address["city"],
        "zip": address["zip"],
        "region": address["region"],
        "ruian_address_code": address.get("ruian_address_code"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "location_source": location.get("source"),
        "location_precision": location.get("precision"),
        "location_checked_at": location.get("checked_at"),
        "registry": seller.get("registry"),
        "flags": seller.get("flags") or [],
        "last_scraped_at": last_scraped_at,
    }


def write_export(
    payload: dict[str, Any],
    db: SupabaseClient,
    *,
    job_run_id: str | None = None,
    ctx: Progress | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Write one ``GET /export`` payload to Supabase; return counts for the admin page."""
    ctx = ctx or _Quiet()
    counts: dict[str, Any] = defaultdict(int)
    counts["skipped_rows"] = len(payload.get("skipped", []))

    # 1. Runs exported before are skipped, and so are their prices.
    runs = payload.get("runs", [])
    done: set[tuple[str, int]] = set()
    if runs:
        existing = db.select(
            "scrape_runs",
            "select=source_key,snapshot_id&snapshot_id="
            + _in(str(run["snapshot_id"]) for run in runs),
        )
        done = {(row["source_key"], row["snapshot_id"]) for row in existing}
    new_runs = [run for run in runs if (run["source_id"], run["snapshot_id"]) not in done]
    counts["runs_already_exported"] = len(runs) - len(new_runs)
    new_snapshots = {run["snapshot_id"] for run in new_runs if run["status"] == "ok"}

    # 2. Sellers.
    sellers = payload.get("sellers", [])
    keys = [seller["seller_key"] for seller in sellers]
    existing_sellers = {
        row["external_key"]: row
        for row in (
            db.select("sellers", "select=id,external_key,owner_id&external_key=" + _in(keys))
            if keys
            else []
        )
    }
    last_fetch: dict[str, str] = {}
    for run in runs:
        if run["status"] == "ok":
            key = run["seller_key"]
            last_fetch[key] = max(last_fetch.get(key, ""), run["fetched_at"])

    seller_ids: dict[str, str] = {}
    owned: set[str] = set()
    new_rows = []
    taken = {row["slug"] for row in _select_all(db, "sellers", "select=slug")} if sellers else set()
    for seller in sellers:
        key = seller["seller_key"]
        columns = _seller_columns(seller, last_fetch.get(key))
        row = existing_sellers.get(key)
        if row is not None and row.get("owner_id"):
            owned.add(key)  # a claimed profile: the owner keeps it up to date
            continue
        if row is not None:
            seller_ids[key] = row["id"]
            if not dry_run:
                db.update("sellers", {"id": row["id"]}, columns)
            counts["sellers_updated"] += 1
        else:
            new_rows.append(
                columns
                | {
                    "external_key": key,
                    "slug": _slug(key, taken),
                    "name": seller["name"][:160],
                    "description": "",
                    "source": "scraper",
                }
            )
    if new_rows:
        counts["sellers_new"] = len(new_rows)
        if dry_run:
            seller_ids |= {row["external_key"]: f"new:{row['external_key']}" for row in new_rows}
        else:
            for row in db.insert("sellers", new_rows):
                seller_ids[row["external_key"]] = row["id"]
    counts["sellers_owned_skipped"] = len(owned)
    ctx.progress(
        80, f"Prodejci: {counts['sellers_new']} nových, {counts['sellers_updated']} upravených"
    )

    # 3. Products.
    by_key = {
        p["product_key"]: p for p in payload.get("products", []) if p["seller_key"] in seller_ids
    }
    first_price: dict[str, dict[str, Any]] = {}
    for observation in payload.get("price_observations", []):
        key = observation["product_key"]
        if key in by_key and (
            key not in first_price or observation["observed_at"] < first_price[key]["observed_at"]
        ):
            first_price[key] = observation
    real_ids = [sid for sid in seller_ids.values() if not sid.startswith("new:")]
    existing_products: dict[tuple[str, str], dict[str, Any]] = {}
    if real_ids:
        for row in _select_all(
            db, "products", "select=id,seller_id,external_id,price_czk&seller_id=" + _in(real_ids)
        ):
            existing_products[(row["seller_id"], row["external_id"])] = row

    product_ids: dict[str, str] = {}
    key_of_seller = {seller_id: key for key, seller_id in seller_ids.items()}

    def write_products(keys: list[str]) -> None:
        to_update, to_insert = [], []
        for key in keys:
            product = by_key[key]
            seller_id = seller_ids[product["seller_key"]]
            tier = product.get("price_tier") or {}
            columns = {name: product.get(name) for name in PRODUCT_COLUMNS}
            columns |= {
                "seller_id": seller_id,
                "external_id": product["item_id"],
                "is_promo": bool(product.get("is_promo")),
                "promo_valid_until": product.get("promo_valid_until"),
                "price_tier_min_quantity": tier.get("min_quantity"),
                "price_tier_unit": tier.get("unit"),
                # Bases are written first, so their ids are known here.
                "base_product_id": product_ids.get(product.get("base_product_key") or ""),
            }
            row = existing_products.get((seller_id, product["item_id"]))
            if row is not None:
                product_ids[key] = row["id"]
                # The current price stays: the price trigger compares it with the new one.
                to_update.append(columns | {"price_czk": row["price_czk"]})
            elif key in first_price:
                price = first_price[key]
                to_insert.append(
                    columns
                    | {"price_czk": price["price_czk"], "price_updated_at": price["observed_at"]}
                )
        counts["products_updated"] += len(to_update)
        counts["products_new"] += len(to_insert)
        if dry_run:
            return
        for batch in _chunks(to_update):
            db.insert("products", batch, on_conflict="seller_id,external_id")
        for batch in _chunks(to_insert):
            for row in db.insert("products", batch, on_conflict="seller_id,external_id"):
                product_ids[f"{key_of_seller[row['seller_id']]}:{row['external_id']}"] = row["id"]

    # Regular products first, then promotions and quantity tiers that point to them.
    variants = [k for k, p in by_key.items() if p.get("base_product_key") in by_key]
    write_products([k for k in by_key if k not in set(variants)])
    write_products(variants)

    # Products no longer in a source that was read successfully now.
    exported_ok = {run["seller_key"] for run in new_runs if run["status"] == "ok"}
    for seller_key in sorted(exported_ok & set(seller_ids)):
        seller_id = seller_ids[seller_key]
        if seller_id.startswith("new:"):
            continue
        current = [p["item_id"] for p in by_key.values() if p["seller_key"] == seller_key]
        gone = [
            row
            for (sid, external_id), row in existing_products.items()
            if sid == seller_id and external_id not in current
        ]
        counts["products_deactivated"] += len(gone)
        if gone and not dry_run:
            db.update_where(
                "products",
                "id=" + _in(row["id"] for row in gone) + "&active=is.true",
                {"active": False},
            )
    ctx.progress(
        88,
        f"Produkty: {counts['products_new']} nových, {counts['products_updated']} upravených, "
        f"{counts['products_deactivated']} už u zdroje nejsou",
    )

    # 4. Prices: always new rows.
    observations = []
    for observation in payload.get("price_observations", []):
        product_id = product_ids.get(observation["product_key"])
        if observation["snapshot_id"] not in new_snapshots:
            continue
        if product_id is None:
            if dry_run and observation["product_key"] in by_key:
                counts["observations"] += 1
            continue
        observations.append(
            {name: observation.get(name) for name in PRICE_COLUMNS}
            | {"product_id": product_id, "source": "scraper"}
        )
    counts["observations"] += len(observations)
    if not dry_run:
        for batch in _chunks(observations):
            db.insert("price_observations", batch)
    ctx.progress(94, f"Ceny: {counts['observations']} nových zjištění")

    # 5. Runs, last: a run row marks its snapshot as exported.
    run_rows = []
    for run in new_runs:
        seller_id = seller_ids.get(run["seller_key"])
        run_rows.append(
            {
                "source_key": run["source_id"],
                "snapshot_id": run["snapshot_id"],
                "seller_id": None if not seller_id or seller_id.startswith("new:") else seller_id,
                "agent": run.get("agent", "collection"),
                "status": RUN_STATUS.get(run["status"], "failed"),
                "started_at": run["fetched_at"],
                "finished_at": run["fetched_at"],
                "items_found": run.get("item_count"),
                "prices_inserted": run.get("exported_count", 0) if run["status"] == "ok" else 0,
                "rejected_count": run.get("skipped_count", 0),
                "error": run.get("error"),
                "http_status": run.get("http_status"),
                "content_sha256": run.get("content_sha256"),
                "changed": run.get("changed"),
                "job_run_id": job_run_id,
                "raw": {"offer_count": run.get("offer_count")},
            }
        )
    counts["runs"] = len(run_rows)
    if run_rows and not dry_run:
        db.insert("scrape_runs", run_rows)
    return dict(counts)


def export_collection(
    state: Any,
    db: SupabaseClient,
    *,
    job_run_id: str,
    ctx: Progress,
    since: str | None = None,
) -> dict[str, Any]:
    """Job ``collect``: fetch the payload of this collection from tools and write it."""
    from podpalto_app.remote_tools.client import get_tools_client

    ctx.progress(75, "Načítám export ze služby tools")
    payload = get_tools_client().export(since)
    return write_export(payload, db, job_run_id=job_run_id, ctx=ctx)


def main() -> None:
    """``python -m podpalto_app.worker.export [--since ISO] [--dry-run]``: a manual import,
    e.g. the first one with all collected data. Needs SUPABASE_URL, SUPABASE_SECRET_KEY and
    the tools service at TOOLS_API_URL."""
    import argparse
    import json
    import os

    from podpalto_app.remote_tools.client import get_tools_client
    from podpalto_app.worker.supabase import SupabaseClient

    parser = argparse.ArgumentParser(description="Write collected prices to Supabase")
    parser.add_argument("--since", help="only snapshots fetched since this ISO time")
    parser.add_argument("--dry-run", action="store_true", help="read Supabase, write nothing")
    args = parser.parse_args()
    db = SupabaseClient(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SECRET_KEY", ""))
    payload = get_tools_client().export(args.since)
    counts = write_export(payload, db, dry_run=args.dry_run)
    print(json.dumps(counts, ensure_ascii=False, indent=1))
    if args.dry_run:
        print("Dry run: nothing was written.")


if __name__ == "__main__":
    main()
