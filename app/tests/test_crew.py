"""Builds the hierarchical crew without calling any LLM."""

from crewai import Process
from podpalto_app.crews.solid_fuels_crew import SolidFuelsCrew


def test_crew_is_hierarchical_with_manager_outside_the_team():
    crew = SolidFuelsCrew().crew()
    assert crew.process == Process.hierarchical
    assert crew.manager_agent.role == "Solid Fuels Market Intelligence Lead"
    assert crew.manager_agent not in crew.agents
    assert not crew.manager_agent.tools
    assert len(crew.agents) == 5


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
