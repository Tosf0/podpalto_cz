"""Hierarchical crew for solid-fuel market intelligence.

A manager agent receives every task and delegates it to the specialists
(``Process.hierarchical``). Roles, goals and the tools of each specialist are
defined in config/agents.yaml, the tasks in config/tasks.yaml.
"""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task

from podpalto_app.crews.llm import agent_llm, manager_llm
from podpalto_app.remote_tools import load_remote_tools


@CrewBase
class SolidFuelsCrew:
    agents: list[BaseAgent]
    tasks: list[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _specialist(self, name: str) -> Agent:
        config = dict(self.agents_config[name])  # type: ignore[index]
        tool_names = config.pop("remote_tools", [])
        return Agent(
            config=config,
            tools=load_remote_tools(tool_names),
            allow_delegation=False,
            verbose=True,
            **agent_llm(config),
        )

    # --- specialists (one method per agent in agents.yaml) -----------------

    @agent
    def pricing_analyst(self) -> Agent:
        return self._specialist("pricing_analyst")

    @agent
    def market_analyst(self) -> Agent:
        return self._specialist("market_analyst")

    @agent
    def regulation_analyst(self) -> Agent:
        return self._specialist("regulation_analyst")

    @agent
    def customer_insights_analyst(self) -> Agent:
        return self._specialist("customer_insights_analyst")

    @agent
    def report_writer(self) -> Agent:
        return self._specialist("report_writer")

    # --- manager: deliberately not an @agent, it must not be in `agents` ---

    def research_manager(self) -> Agent:
        config = self.agents_config["research_manager"]  # type: ignore[index]
        return Agent(
            config=config,
            allow_delegation=True,
            verbose=True,
            **manager_llm(config),
        )

    # --- tasks (one method per task in tasks.yaml, in execution order) -----

    @task
    def pricing_research(self) -> Task:
        return Task(config=self.tasks_config["pricing_research"])  # type: ignore[index]

    @task
    def market_trends_research(self) -> Task:
        return Task(config=self.tasks_config["market_trends_research"])  # type: ignore[index]

    @task
    def regulation_research(self) -> Task:
        return Task(config=self.tasks_config["regulation_research"])  # type: ignore[index]

    @task
    def customer_sentiment_research(self) -> Task:
        return Task(config=self.tasks_config["customer_sentiment_research"])  # type: ignore[index]

    @task
    def final_report(self) -> Task:
        return Task(config=self.tasks_config["final_report"])  # type: ignore[index]

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.hierarchical,
            manager_agent=self.research_manager(),
            verbose=True,
        )
