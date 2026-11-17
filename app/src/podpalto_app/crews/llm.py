"""Which LLM an agent gets: the manager has its own model, every other agent shares one.

Set in the environment (see settings.py): MANAGER_MODEL for the manager, AGENT_MODEL for
the specialists and the extraction crew; both fall back to MODEL. An ``llm:`` key in an
agent's YAML overrides both.
"""

from __future__ import annotations

from podpalto_app.settings import settings


def _options(config: dict, model: str | None) -> dict:
    return {} if config.get("llm") or not model else {"llm": model}


def manager_llm(config: dict) -> dict:
    """Keyword arguments for ``Agent(...)`` of the manager."""
    return _options(config, settings.manager_model)


def agent_llm(config: dict) -> dict:
    """Keyword arguments for ``Agent(...)`` of every other agent."""
    return _options(config, settings.agent_model)
