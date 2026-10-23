import time
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, AgentRun


class ContextAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="context_agent")

    async def analyze(
        self,
        files: List[ReviewFile],
        language: str,
        context: Optional[Dict[str, Any]] = None,
        provider: str = "mock",
        model: str = "mock-agent-v1"
    ) -> AgentRun:
        start_time = time.time()
        file_summaries = []
        all_symbols = []

        for f in files:
            lines = f.content.splitlines()
            line_count = len(lines)
            
            # Simple regex parser for functions, classes, exports
            functions = re.findall(r"(?:function\s+([A-Za-z0-9_]+)|(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|def\s+([A-Za-z0-9_]+))", f.content)
            classes = re.findall(r"class\s+([A-Za-z0-9_]+)", f.content)
            
            flattened_funcs = [fn for group in functions for fn in group if fn]
            all_symbols.extend(flattened_funcs + classes)

            file_summaries.append({
                "path": f.path,
                "lines": line_count,
                "functions": flattened_funcs,
                "classes": classes,
            })

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Analyzed {len(files)} source files. Identified {len(all_symbols)} functions/classes."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=[],
            summary=summary,
            output_summary={"files": file_summaries, "symbolsCount": len(all_symbols)}
        )
