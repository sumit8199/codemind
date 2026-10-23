from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.models import ReviewFile, Finding, AgentRun


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def analyze(
        self,
        files: List[ReviewFile],
        language: str,
        context: Optional[Dict[str, Any]] = None,
        provider: str = "mock",
        model: str = "mock-agent-v1"
    ) -> AgentRun:
        """Execute agent analysis on files."""
        pass
