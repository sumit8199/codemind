import time
import uuid
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, Finding, AgentRun, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class PerformanceAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="performance_agent")

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

                # Check 1: Synchronous I/O in Node.js (e.g. readFileSync, writeFileSync)
                if re.search(r"fs\.(?:readFileSync|writeFileSync|existsSync|appendFileSync)", line):
                    title = "Blocking Synchronous Filesystem I/O"
                    evidence = f"Call to '{line.strip()}' at line {line_no} blocks the Node.js event loop"
                    fp = generate_finding_fingerprint("performance", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="performance",
                        severity=SeverityEnum.MEDIUM,
                        confidence=0.92,
                        title=title,
                        description="Synchronous filesystem operations block the single-threaded Node.js event loop, degrading throughput for all concurrent requests.",
                        impact="High latency spikes and server starvation under concurrent load.",
                        recommendation="Use asynchronous fs/promises operations (e.g. fs.promises.readFile).",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        suggestedPatch="const data = await fs.promises.readFile(path, 'utf8');",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Check 2: Sequential await inside loop (potential N+1 performance bottleneck)
                if re.search(r"(?:for\s*\(|for\s+await\s*\(|\.forEach\s*\()", line):
                    # Check next 3 lines for await
                    window = lines[idx:min(idx + 5, len(lines))]
                    if any("await " in w for w in window):
                        title = "Sequential Await in Loop (Potential N+1 Bottleneck)"
                        evidence = f"Loop construct at line {line_no} executes sequential asynchronous calls"
                        fp = generate_finding_fingerprint("performance", f.path, line_no, line_no, title)
                        findings.append(Finding(
                            id=str(uuid.uuid4()),
                            agent=self.name,
                            category="performance",
                            severity=SeverityEnum.LOW,
                            confidence=0.81,
                            title=title,
                            description="Executing async requests serially inside a loop multiplies round-trip network/DB latency.",
                            impact="Elevated response duration proportional to the number of items.",
                            recommendation="Batch items with Promise.all() or an orchestrated bulk query.",
                            filePath=f.path,
                            startLine=line_no,
                            endLine=line_no,
                            codeSnippet=line.strip(),
                            evidence=evidence,
                            suggestedPatch="await Promise.all(items.map(async (item) => processItem(item)));",
                            sourceType=SourceTypeEnum.LLM,
                            status=FindingStatusEnum.OPEN,
                            fingerprint=fp
                        ))

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Performance analysis identified {len(findings)} potential optimization(s)."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=findings,
            summary=summary
        )
