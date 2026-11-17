"""Builds the hierarchical crew without calling any LLM."""

from pathlib import Path

from crewai import Process
from podpalto_app.crews.extraction_crew import ExtractionCrew
from podpalto_app.crews.solid_fuels_crew import SolidFuelsCrew


def test_crew_is_hierarchical_with_manager_outside_the_team():
    crew = SolidFuelsCrew().crew()
    assert crew.process == Process.hierarchical
    assert crew.manager_agent.role == "Solid Fuels Market Intelligence Lead"
    assert crew.manager_agent not in crew.agents
    assert not crew.manager_agent.tools
    assert len(crew.agents) == 5


def test_manager_and_agents_use_their_own_models():
    # conftest sets MANAGER_MODEL=claude-opus-5-5 and AGENT_MODEL=claude-sonnet-5-5
    crew = SolidFuelsCrew().crew()
    assert "claude-opus-5-5" in crew.manager_agent.llm.model
    assert all("claude-sonnet-5-5" in agent.llm.model for agent in crew.agents)
    extraction = ExtractionCrew().crew()
    assert all("claude-sonnet-5-5" in agent.llm.model for agent in extraction.agents)


def test_model_settings_fall_back_and_yaml_wins(monkeypatch):
    from podpalto_app.crews import llm
    from podpalto_app.settings import Settings

    only_agents = Settings(
        manager_model=None, agent_model="agent/model", tools_api_url="",
        tools_api_timeout_s=1, collect_timeout_s=1, output_dir=Path("."),
    )  # fmt: skip
    monkeypatch.setattr(llm, "settings", only_agents)
    assert llm.manager_llm({}) == {}  # nothing set: CrewAI's own default (MODEL)
    assert llm.agent_llm({}) == {"llm": "agent/model"}
    assert llm.agent_llm({"llm": "yaml/model"}) == {}  # an llm: key in the YAML wins


def test_specialists_get_their_remote_tools():
    crew = SolidFuelsCrew().crew()
    tools_by_role = {agent.role: [tool.name for tool in agent.tools] for agent in crew.agents}
    assert tools_by_role == {
        "Solid Fuel Pricing Analyst": ["eshop_catalog", "price_comparison"],
        "Solid Fuel Market Trends Analyst": ["market_statistics"],
        "Energy Regulation and News Analyst": ["news_search"],
        "Customer Insights Analyst": ["customer_reviews"],
        "Market Intelligence Report Writer": [],
    }


def test_tasks_are_unassigned_and_report_uses_all_research():
    crew = SolidFuelsCrew().crew()
    assert all(task.agent is None for task in crew.tasks)
    assert len(crew.tasks[-1].context) == 4
