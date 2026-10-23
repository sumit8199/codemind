import time
import uuid
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, Finding, AgentRun, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="security_agent")

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

                # Check 1: Insecure logging of sensitive data (passwords, tokens, keys)
                if re.search(r"console\.(?:log|info|debug)\(.*(?:password|token|secret|key|credit).*\)", line, re.IGNORECASE):
                    title = "Potential Sensitive Data Exposure in Logs"
                    evidence = f"Log statement '{line.strip()}' at line {line_no} appears to print sensitive fields"
                    fp = generate_finding_fingerprint("security", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="security",
                        severity=SeverityEnum.HIGH,
                        confidence=0.89,
                        title=title,
                        description="Logging authentication tokens or user credentials exposes them to log aggregation systems and unauthorized staff.",
                        impact="Credentials stored in plain logs can be breached and used for privilege escalation.",
                        recommendation="Sanitize or redact sensitive fields prior to logging, or avoid logging credential payloads entirely.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        cwe="CWE-532",
                        suggestedPatch="// Redact sensitive fields before logging\nlogger.info('User action completed', { userId: user.id });",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Check 2: Unsafe file path construction (Path traversal risk)
                if re.search(r"path\.(?:join|resolve)\([^)]*req\.(?:query|params|body)", line):
                    title = "Potential Path Traversal in File Operations"
                    evidence = f"Path operation '{line.strip()}' at line {line_no} directly incorporates untrusted user request parameters"
                    fp = generate_finding_fingerprint("security", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="security",
                        severity=SeverityEnum.HIGH,
                        confidence=0.91,
                        title=title,
                        description="Constructing filesystem paths directly from user input without canonicalization or allowlisting enables Directory Traversal (dot-dot-slash).",
                        impact="Attackers can read or overwrite arbitrary files on the server hosting the application.",
                        recommendation="Validate paths against a strict allowlist or verify that path.resolve() begins with the designated base directory.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=line.strip(),
                        evidence=evidence,
                        cwe="CWE-22",
                        suggestedPatch="const safeName = path.basename(req.params.file);\nconst target = path.resolve(BASE_DIR, safeName);\nif (!target.startsWith(BASE_DIR)) throw new Error('Access denied');",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Security analysis identified {len(findings)} potential security risk(s)."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=findings,
            summary=summary
        )
