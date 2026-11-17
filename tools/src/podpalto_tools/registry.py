"""Tool contract: every source module exposes one ``ToolSpec`` named ``TOOL``."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel


class ToolError(Exception):
    """Raised by a handler when the source fails; the API turns it into HTTP 502."""


@dataclass(frozen=True)
class ToolSpec:
    name: str
    """Unique tool name; also the URL segment (POST /tools/{name})."""
    description: str
    """Shown to the LLM, so say what the tool returns and when to use it."""
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    handler: Callable[[Any], BaseModel]
    mock: bool = True
