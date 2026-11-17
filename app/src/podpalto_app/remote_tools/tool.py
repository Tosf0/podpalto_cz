"""CrewAI tools generated from the tools service catalog.

Nothing about a concrete tool is hard-coded here: name, description and the
argument schema come from ``GET /tools``, so a new source in the tools service
becomes usable by adding its name to an agent's ``remote_tools`` in agents.yaml.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Any

from crewai.tools import BaseTool
from crewai.utilities.pydantic_schema_utils import create_model_from_schema
from pydantic import PrivateAttr, ValidationError

from podpalto_app.remote_tools.client import ToolsClient, ToolsServiceError, get_tools_client


class RemoteTool(BaseTool):
    """Forwards the call to ``POST /tools/{remote_name}`` and returns the JSON response."""

    remote_name: str
    _client: ToolsClient = PrivateAttr()

    def _run(self, **kwargs: Any) -> str:
        # Errors are returned (not raised) so the agent can read them and adjust.
        try:
            arguments = self.args_schema(**kwargs).model_dump(mode="json", exclude_none=True)
        except ValidationError as exc:
            return f"ERROR: invalid arguments for {self.remote_name}: {exc}"
        try:
            result = self._client.call(self.remote_name, arguments)
        except ToolsServiceError as exc:
            return f"ERROR: {exc}"
        return json.dumps(result, ensure_ascii=False)


def load_remote_tools(names: Iterable[str], client: ToolsClient | None = None) -> list[BaseTool]:
    """Build CrewAI tools for the given tool names from the service catalog."""
    names = list(names)
    if not names:
        return []
    client = client or get_tools_client()
    catalog = client.catalog()
    unknown = [name for name in names if name not in catalog]
    if unknown:
        raise ToolsServiceError(
            f"unknown remote tools {unknown}; the tools service offers {sorted(catalog)}"
        )
    tools: list[BaseTool] = []
    for name in names:
        info = catalog[name]
        tool = RemoteTool(
            name=name,
            description=info["description"],
            args_schema=create_model_from_schema(info["input_schema"], model_name=f"{name}_args"),
            remote_name=name,
        )
        tool._client = client
        tools.append(tool)
    return tools
