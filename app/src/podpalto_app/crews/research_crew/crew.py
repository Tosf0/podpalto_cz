"""Research crew: reads a competitor's website and writes a short analysis."""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task
from podpalto_tools import PageTextTool


@CrewBase
class ResearchCrew:
    """Agents and tasks are defined in config/agents.yaml and config/tasks.yaml."""

    agents: list[BaseAgent]
    tasks: list[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def web_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["web_researcher"],  # type: ignore[index]
            tools=[PageTextTool()],
            verbose=True,
        )

    @agent
    def market_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config["market_analyst"],  # type: ignore[index]
            verbose=True,
        )

    @task
    def research_task(self) -> Task:
        return Task(config=self.tasks_config["research_task"])  # type: ignore[index]

    @task
    def analysis_task(self) -> Task:
        return Task(config=self.tasks_config["analysis_task"])  # type: ignore[index]

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
