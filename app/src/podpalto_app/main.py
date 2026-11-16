"""CLI entry points (console scripts `kickoff` and `plot`).

The HTTP API lives in ``podpalto_app.api``; this module runs one research
flow directly, which is handy for development. The tools service must be up.
"""

from __future__ import annotations

import argparse

from podpalto_app.domain import ALL_FUEL_TYPES, FuelType
from podpalto_app.flows import MarketResearchFlow, run_market_research


def kickoff() -> None:
    parser = argparse.ArgumentParser(description="Run one solid-fuel market research flow.")
    parser.add_argument(
        "fuel_types",
        nargs="*",
        type=FuelType,
        default=ALL_FUEL_TYPES,
        help=f"fuel types to research (default: all): {', '.join(f.value for f in FuelType)}",
    )
    parser.add_argument("--region", default="CZ")
    parser.add_argument("--focus", default="", help="optional question the report should focus on")
    args = parser.parse_args()

    state = run_market_research(args.fuel_types, region=args.region, focus=args.focus)
    print(f"Report saved to {state.report_path}")


def plot() -> None:
    MarketResearchFlow().plot()


if __name__ == "__main__":
    kickoff()
