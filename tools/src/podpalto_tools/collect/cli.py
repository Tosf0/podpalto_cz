"""Command line entry point: ``uv run podpalto-collect [source_id ...]``."""

from __future__ import annotations

import argparse
import sys

from podpalto_tools.collect.collector import CollectResult, collect_all


def _report(result: CollectResult) -> None:
    counts = f"{result.offers} fuel offers of {result.items} items" if result.items else ""
    line = f"{result.source_id:16} {result.status:18} {counts}"
    print(f"{line.rstrip()}  {result.detail}".rstrip(), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect seller prices into the snapshot DB")
    parser.add_argument("source_ids", nargs="*", help="sources to collect (default: all enabled)")
    args = parser.parse_args()
    try:
        results = collect_all(args.source_ids or None, on_result=_report)
    except KeyError as exc:
        sys.exit(str(exc.args[0]))
    # needs_extraction is not a failure: price lists are read by the app's CollectionFlow.
    if any(result.status in {"error", "blocked_by_robots"} for result in results):
        sys.exit(1)


def verify_sellers() -> None:
    """``uv run podpalto-verify-sellers [source_id ...]``: IČO on the seller's site + ARES."""
    import json

    from podpalto_tools.collect.ares import verify_seller
    from podpalto_tools.collect.collector import http_fetch, resolve_sources
    from podpalto_tools.settings import get_settings

    parser = argparse.ArgumentParser(description="Find each seller's IČO and check it in ARES")
    parser.add_argument("source_ids", nargs="*", help="sources to check (default: all enabled)")
    args = parser.parse_args()
    settings = get_settings()
    try:
        sources = resolve_sources(args.source_ids or None, settings)
    except KeyError as exc:
        sys.exit(str(exc.args[0]))

    fetch = http_fetch(settings)
    checks = []
    for source in sources:
        check = verify_seller(source, fetch, settings)
        checks.append(check)
        region = (
            "" if check.region_matches is None
            else "region ok" if check.region_matches
            else f"REGION DIFFERS: registry {check.registry_region}, ARES {check.ares_region}"
        )  # fmt: skip
        print(f"{source.id:14} {check.status:13} {check.ico or '':9} {check.ares_name or ''}"
              f" | {check.ares_address or check.detail} {region}", flush=True)  # fmt: skip
    report = settings.data_dir / "sellers.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    # Keep the results of sources not checked in this run.
    merged = {}
    if report.is_file():
        merged = {c["source_id"]: c for c in json.loads(report.read_text(encoding="utf-8"))}
    merged.update({c.source_id: c.model_dump() for c in checks})
    report.write_text(
        json.dumps(list(merged.values()), ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"Report saved to {report}. The registry is not changed; copy verified IČO and "
          "regions into sources.yaml after a review.")  # fmt: skip


def locate_sellers() -> None:
    """``uv run podpalto-locate-sellers [source_id ...]``: address and location of each seller
    from ARES and RÚIAN into the committed ``seller_locations.json`` (no seller pages)."""
    from podpalto_tools.collect.collector import http_fetch, resolve_sources
    from podpalto_tools.collect.locate import locate_sellers as locate
    from podpalto_tools.collect.locate import save_locations
    from podpalto_tools.collect.ruian import find_address_points, street_point
    from podpalto_tools.settings import get_settings

    parser = argparse.ArgumentParser(description="Locate each seller via ARES and RÚIAN")
    parser.add_argument("source_ids", nargs="*", help="sources to locate (default: all enabled)")
    parser.add_argument(
        "--find", nargs=3, metavar=("PSC", "CISLO_POPISNE", "OBEC"),
        help="only print the RÚIAN codes of an address, e.g. --find 38501 123 Vimperk",
    )  # fmt: skip
    parser.add_argument(
        "--street", nargs=2, metavar=("ULICE", "OBEC"),
        help="only print the middle of a street (lat, lng) for a yard without a house number",
    )  # fmt: skip
    args = parser.parse_args()
    settings = get_settings()
    fetch = http_fetch(settings)
    if args.street:
        print(street_point(*args.street, fetch) or "street not found")
        return
    if args.find:
        zip_code, number, city = args.find
        for code, address in find_address_points(zip_code, int(number), city, fetch):
            print(f"{code}  {address}")
        return
    try:
        sources = resolve_sources(args.source_ids or None, settings)
    except KeyError as exc:
        sys.exit(str(exc.args[0]))
    found = locate(sources, fetch)
    for seller in found:
        place = (
            f"{seller.address.region} {seller.address.street}, {seller.address.city}"
            if seller.address else "-"
        )  # fmt: skip
        print(f"{seller.seller_key:14} {seller.registry.status:11} {place:55} "
              f"{','.join(seller.flags)} {seller.detail}".rstrip(), flush=True)  # fmt: skip
    path = save_locations(found)
    print(f"Saved to {path}. Review the diff before committing.")


def export() -> None:
    """``uv run podpalto-export [--since ISO] [--out FILE]``: the payload the worker writes to
    Supabase, as a JSON file for review (docs/agent-output-spec.md, section 10)."""
    from collections import Counter
    from datetime import datetime, timezone
    from pathlib import Path

    from podpalto_tools.collect.export import build_export
    from podpalto_tools.collect.locate import load_locations
    from podpalto_tools.collect.source_registry import enabled_sources
    from podpalto_tools.collect.store import Store
    from podpalto_tools.settings import get_settings

    parser = argparse.ArgumentParser(description="Export collected prices for the web app")
    parser.add_argument("--since", help="only snapshots fetched since this ISO time")
    parser.add_argument("--out", type=Path, help="default: outputs/podpalto-export-<time>.json")
    args = parser.parse_args()
    payload = build_export(
        Store(get_settings().db_path), enabled_sources(), load_locations(), args.since
    )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = args.out or Path("outputs") / f"podpalto-export-{stamp}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(payload.model_dump_json(indent=1), encoding="utf-8")
    skipped = Counter(item.reason for item in payload.skipped)
    print(f"{len(payload.sellers)} sellers, {len(payload.products)} products, "
          f"{len(payload.price_observations)} prices, {len(payload.runs)} runs; "
          f"skipped: {dict(skipped) or 'none'}")  # fmt: skip
    print(f"Saved to {out}")


def renormalize() -> None:
    """``uv run podpalto-renormalize [source_id ...]``: re-check and recompute the stored
    rows of price lists with the current rules. No download, no LLM."""
    from podpalto_tools.collect.collector import renormalize_source, resolve_sources
    from podpalto_tools.collect.store import Store
    from podpalto_tools.settings import get_settings

    parser = argparse.ArgumentParser(description="Normalise stored price-list rows again")
    parser.add_argument("source_ids", nargs="*", help="price lists (default: all enabled)")
    args = parser.parse_args()
    settings = get_settings()
    try:
        sources = resolve_sources(args.source_ids or None, settings)
    except KeyError as exc:
        sys.exit(str(exc.args[0]))
    store = Store(settings.db_path)
    for source in sources:
        if not source.kind.needs_extraction:
            continue
        result = renormalize_source(source, store, settings)
        print(
            f"{source.id:14} {result.status:9} accepted={result.accepted} "
            f"rejected={result.rejected} duplicates={result.duplicates} {result.detail}"
        )


def load_opendata() -> None:
    """``uv run podpalto-load-opendata``: download the census heating data (ČSÚ, 2021)."""
    from podpalto_tools.collect.collector import FetchError, http_fetch
    from podpalto_tools.collect.opendata import load_census_heating
    from podpalto_tools.settings import get_settings

    settings = get_settings()
    try:
        path = load_census_heating(http_fetch(settings), settings)
    except (FetchError, PermissionError, ValueError) as exc:
        sys.exit(f"census data not loaded: {exc}")
    print(f"Census 2021 heating data saved to {path}")


if __name__ == "__main__":
    main()
