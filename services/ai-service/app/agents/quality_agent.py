import time
import uuid
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, Finding, AgentRun, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class QualityAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="quality_agent")

    async def analyze(
        self,
        files: List[ReviewFile],
        language: str,
        context: Optional[Dict[str, Any]] = None,
        provider: str = "mock",
        model: str = "mock-agent-v1"
    ) -> AgentRun:
        start_time = time.time()
        findings: List[Finding] = []

        for f in files:
            lines = f.content.splitlines()
            for idx, line in enumerate(lines):
                line_no = idx + 1

                # Check 1: Magic numbers in conditions or equations
                if re.search(r"(?:===|!==|>|<|>=|<=)\s*(?:[2-9]\d{2,}|86400|3600|60000)\b", line):
                    title = "Magic Number in Conditional Logic"
                    evidence = f"Literal constant '{line.strip()}' at line {line_no} lacks self-descriptive naming"
                    fp = generate_finding_fingerprint("quality", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="quality",
                        severity=SeverityEnum.INFO,
                        confidence=0.78,
                        title=title,
                        description="Direct numeric literals without named constants reduce readability and increase refactoring risk.",
                        impact="Developers modifying timeout or threshold values may introduce regression bugs.",
                        recommendation="Declare named constants at module or configuration level.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        suggestedPatch="const TIMEOUT_MS = 60000;\n// use TIMEOUT_MS in logic",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Check 2: 'any' type usage in TypeScript
                if language.lower() in ["typescript", "ts"] and re.search(r":\s*any\b", line):
                    title = "Use of 'any' Disables TypeScript Type Safety"
                    evidence = f"Type annotation '{line.strip()}' at line {line_no} uses 'any'"
                    fp = generate_finding_fingerprint("quality", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="quality",
                        severity=SeverityEnum.LOW,
                        confidence=0.86,
                        title=title,
                        description="Using 'any' turns off type checker verification, forfeiting the compile-time safety benefits of TypeScript.",
                        impact="Type mismatches and missing properties will only manifest as runtime exceptions.",
                        recommendation="Replace 'any' with a strict interface, generic type, or 'unknown' with type narrowing.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        suggestedPatch=line.replace(": any", ": unknown"),
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Quality analysis completed with {len(findings)} maintainability observation(s)."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=findings,
            summary=summary
        )
