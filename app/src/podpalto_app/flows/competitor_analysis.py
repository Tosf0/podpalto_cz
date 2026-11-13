"""End-to-end flow: research one competitor and save the report."""

from __future__ import annotations

import re
from datetime import datetime

from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel

from podpalto_app.crews.research_crew import ResearchCrew
from podpalto_app.settings import settings


class CompetitorAnalysisState(BaseModel):
    competitor_url: str = ""
    report: str = ""
    report_path: str = ""


class CompetitorAnalysisFlow(Flow[CompetitorAnalysisState]):
    @start()
    def validate_input(self) -> None:
        if not self.state.competitor_url:
            self.state.competitor_url = settings.competitor_url

    @listen(validate_input)
    def run_research(self) -> None:
        result = ResearchCrew().crew().kickoff(inputs={"competitor_url": self.state.competitor_url})
        self.state.report = result.raw

    @listen(run_research)
    def save_report(self) -> str:
        settings.output_dir.mkdir(parents=True, exist_ok=True)
        slug = re.sub(r"[^a-z0-9]+", "-", self.state.competitor_url.lower()).strip("-")
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = settings.output_dir / f"{stamp}_{slug}.md"
        path.write_text(self.state.report, encoding="utf-8")
        self.state.report_path = str(path)
        return self.state.report_path
