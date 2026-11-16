"""End-to-end flow: check inputs -> hierarchical crew -> save the report."""

from __future__ import annotations

from datetime import datetime

from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel, Field

from podpalto_app.crews.solid_fuels_crew import SolidFuelsCrew
from podpalto_app.domain import ALL_FUEL_TYPES, FuelType
from podpalto_app.remote_tools import ToolsServiceError, get_tools_client
from podpalto_app.settings import settings


class MarketResearchState(BaseModel):
    fuel_types: list[FuelType] = Field(default_factory=list)
    region: str = "CZ"
    focus: str = ""
    report: str = ""
    report_path: str = ""


class MarketResearchFlow(Flow[MarketResearchState]):
    @start()
    def prepare(self) -> None:
        if not self.state.fuel_types:
            self.state.fuel_types = list(ALL_FUEL_TYPES)
        if not get_tools_client().is_healthy():
            raise ToolsServiceError(
                f"tools service is not reachable at {settings.tools_api_url}; "
                "start it before running a research flow"
            )

    @listen(prepare)
    def run_crew(self) -> None:
        result = (
            SolidFuelsCrew()
            .crew()
            .kickoff(
                inputs={
                    "fuel_types": ", ".join(fuel.value for fuel in self.state.fuel_types),
                    "region": self.state.region,
                    "focus": self.state.focus or "none",
                }
            )
        )
        self.state.report = result.raw

    @listen(run_crew)
    def save_report(self) -> str:
        settings.output_dir.mkdir(parents=True, exist_ok=True)
        fuels = "-".join(fuel.value for fuel in self.state.fuel_types)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = settings.output_dir / f"{stamp}_{fuels}.md"
        path.write_text(self.state.report, encoding="utf-8")
        self.state.report_path = str(path)
        return self.state.report_path


def run_market_research(
    fuel_types: list[FuelType] | None = None, region: str = "CZ", focus: str = ""
) -> MarketResearchState:
    """Run the flow synchronously and return its final state (used by the CLI and the API)."""
    flow = MarketResearchFlow()
    flow.kickoff(inputs={"fuel_types": fuel_types or [], "region": region, "focus": focus})
    return flow.state
