"""Extraction crew: the "Cognitive Processing Crew" of the source report (PDF, section 4).

The CollectionFlow starts it once per price-list page:

    price_list_extractor  ->  market_qa_auditor     (Process.sequential)

Both tasks return ``SellerPriceExtractionList`` (``output_pydantic``). The audit task has
a guardrail that the flow supplies: it sends the rows to the tools service for a dry-run
check of every quote, and when a row fails the auditor gets the reasons and another
attempt (``guardrail_max_retries=3``).

Sequential, unlike the report crew: the PDF prescribes a fixed extractor -> auditor
pipeline, and a manager would only add LLM calls to a two-step job.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from crewai import Agent, Crew, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task

from podpalto_app.crews.llm import agent_llm
from podpalto_app.domain import SellerPriceExtractionList

Guardrail = Callable[[Any], tuple[bool, Any]]


@CrewBase
class ExtractionCrew:
    agents: list[BaseAgent]
    tasks: list[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def __init__(self, guardrail: Guardrail | None = None) -> None:
        self._guardrail = guardrail

    def _agent(self, name: str) -> Agent:
        config = self.agents_config[name]  # type: ignore[index]
        return Agent(
            config=config,
            allow_delegation=False,
            verbose=True,
            **agent_llm(config),
        )

    @agent
    def price_list_extractor(self) -> Agent:
        return self._agent("price_list_extractor")

    @agent
    def market_qa_auditor(self) -> Agent:
        return self._agent("market_qa_auditor")

    @task
    def extract_price_rows(self) -> Task:
        return Task(
            config=self.tasks_config["extract_price_rows"],  # type: ignore[index]
            agent=self.price_list_extractor(),
            output_pydantic=SellerPriceExtractionList,
        )

    @task
    def audit_price_rows(self) -> Task:
        return Task(
            config=self.tasks_config["audit_price_rows"],  # type: ignore[index]
            agent=self.market_qa_auditor(),
            output_pydantic=SellerPriceExtractionList,
            guardrail=self._guardrail,
            guardrail_max_retries=3,
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
