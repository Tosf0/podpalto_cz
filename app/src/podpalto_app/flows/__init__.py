"""Flows orchestrate crews (and plain Python steps) into end-to-end pipelines.

CollectionFlow      collects prices source by source (PDF, section 4.1)
MarketResearchFlow  turns the collected data into a report for households
"""

from podpalto_app.flows.collection import CollectionFlow, FuelPipelineState, run_collection
from podpalto_app.flows.market_research import (
    MarketResearchFlow,
    MarketResearchState,
    run_market_research,
)

__all__ = [
    "CollectionFlow",
    "FuelPipelineState",
    "MarketResearchFlow",
    "MarketResearchState",
    "run_collection",
    "run_market_research",
]
