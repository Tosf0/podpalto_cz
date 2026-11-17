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


if __name__ == "__main__":
    main()
