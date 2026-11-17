"""CLI entry points (console scripts `collect`, `kickoff` and `plot`).

The HTTP API lives in ``podpalto_app.api``; these commands run one flow directly,
which is handy for development. The tools service must be up.
"""

from __future__ import annotations

import argparse
import logging
import sys

from podpalto_app.domain import ALL_FUEL_TYPES, FuelType
from podpalto_app.flows import (
    CollectionFlow,
    MarketResearchFlow,
    run_collection,
    run_market_research,
)


def collect() -> None:
    parser = argparse.ArgumentParser(
        description="Collect seller prices source by source (CollectionFlow)."
    )
    parser.add_argument("source_ids", nargs="*", help="sources to collect (default: all enabled)")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    state = run_collection(args.source_ids or None)
    for run in state.results:
        counts = f"{run.records} records" if run.records is not None else ""
        if run.rejected_rows:
            counts += f", {run.rejected_rows} rows rejected"
        print(f"{run.source_id:16} {run.route:11} {run.status:18} {counts:30} {run.detail}")
    print(f"Summary saved to {state.summary_path}")
    if any(run.status in {"error", "blocked_by_robots", "rejected"} for run in state.results):
        sys.exit(1)


def kickoff() -> None:
    parser = argparse.ArgumentParser(description="Run one solid-fuel market research flow.")
    parser.add_argument(
        "fuel_types",
        nargs="*",
        type=FuelType,
        default=ALL_FUEL_TYPES,
        help=f"fuel types to research (default: all): {', '.join(f.value for f in FuelType)}",
    )
    parser.add_argument("--region", default="CZ", help="CZ or a region name, e.g. 'Kraj Vysočina'")
    parser.add_argument("--focus", default="", help="optional question the report should focus on")
    args = parser.parse_args()

    state = run_market_research(args.fuel_types, region=args.region, focus=args.focus)
    print(f"Report saved to {state.report_path}")


def plot() -> None:
    CollectionFlow().plot("collection_flow.html")
    MarketResearchFlow().plot("market_research_flow.html")


if __name__ == "__main__":
    kickoff()
