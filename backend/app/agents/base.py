"""Agent base definitions."""

from typing import Any, Dict, List, Optional


class AgentResult:
    """Structured result produced by an AI agent."""

    def __init__(self, agent: str, data: Dict[str, Any], sources: Optional[List[str]] = None):
        self.agent = agent
        self.data = data
        self.sources = sources or []

    def to_dict(self) -> Dict[str, Any]:
        return {"agent": self.agent, "data": self.data, "sources": self.sources}
