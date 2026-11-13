"""Smoke tests that build the crew without calling any LLM."""

from podpalto_app.crews.research_crew import ResearchCrew


def test_research_crew_builds():
    crew = ResearchCrew().crew()
    assert len(crew.agents) == 2
    assert len(crew.tasks) == 2
