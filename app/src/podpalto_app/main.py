"""Entry points (also exposed as console scripts: `kickoff`, `plot`)."""

from __future__ import annotations

import sys

from podpalto_app.flows import CompetitorAnalysisFlow


def kickoff() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    report_path = CompetitorAnalysisFlow().kickoff(inputs={"competitor_url": url})
    print(f"Report saved to {report_path}")


def plot() -> None:
    CompetitorAnalysisFlow().plot()


if __name__ == "__main__":
    kickoff()
