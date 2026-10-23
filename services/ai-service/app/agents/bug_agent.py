import time
import uuid
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, Finding, AgentRun, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class BugAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="bug_agent")

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
                
                # Check 1: Potential undefined/null dereference without optional chaining or check
                if re.search(r"\b(\w+)\.data\.(\w+)", line) and "if" not in line and "?." not in line:
                    title = "Unchecked Nested Object Access"
                    evidence = f"Direct access '{line.strip()}' at line {line_no} without null check"
                    fp = generate_finding_fingerprint("bugs", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="bugs",
                        severity=SeverityEnum.MEDIUM,
                        confidence=0.82,
                        title=title,
                        description="Accessing nested property without null/undefined guard may cause a runtime TypeError.",
                        impact="Uncaught TypeError crashes the request or client rendering loop.",
                        recommendation="Use optional chaining (?.) or validate that intermediate properties exist.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        suggestedPatch=line.replace(".data.", "?.data?."),
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Check 2: Loose equality comparison (== instead of ===)
                if re.search(r"[^=!]==[^=]", line):
                    title = "Loose Equality Comparison"
                    evidence = f"Expression '{line.strip()}' at line {line_no} uses loose equality '=='"
                    fp = generate_finding_fingerprint("bugs", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="bugs",
                        severity=SeverityEnum.LOW,
                        confidence=0.88,
                        title=title,
                        description="Using loose equality (==) allows implicit type coercion which frequently causes subtle logic defects.",
                        impact="Unintended truthy/falsy matches (e.g. 0 == '' or null == undefined).",
                        recommendation="Use strict equality (===) to ensure both value and type match.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        suggestedPatch=line.replace("==", "==="),
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Check 3: Async function missing await on promise or returned promise ignored
                if re.search(r"async\s+", line) and "return" not in line:
                    pass

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Bug analysis identified {len(findings)} potential logic defect(s)."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=findings,
            summary=summary
        )
