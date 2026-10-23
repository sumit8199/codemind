import time
import uuid
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, Finding, AgentRun, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class TestAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="test_agent")

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
            # If the file is not a test file, check if critical functions lack corresponding edge tests
            if not any(test_indicator in f.path.lower() for test_indicator in [".test.", ".spec.", "__tests__", "test_"]):
                for idx, line in enumerate(lines):
                    line_no = idx + 1
                    
                    # Detect public exported business function
                    if re.search(r"export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)|def\s+([A-Za-z0-9_]+)", line):
                        fn_name = line.split("function")[-1].split("(")[0].strip() if "function" in line else line.split("def")[-1].split("(")[0].strip()
                        title = f"Missing Unit Test Suite for '{fn_name}'"
                        evidence = f"Function signature '{line.strip()}' at line {line_no} of {f.path}"
                        fp = generate_finding_fingerprint("tests", f.path, line_no, line_no, title)
                        
                        test_scaffold = (
                            f"describe('{fn_name}', () => {{\n"
                            f"  it('should handle typical inputs properly', async () => {{\n"
                            f"    // arrange & act\n"
                            f"  }});\n"
                            f"  it('should reject invalid or boundary inputs gracefully', async () => {{\n"
                            f"    // assert error or fallback\n"
                            f"  }});\n"
                            f"}});"
                        )

                        findings.append(Finding(
                            id=str(uuid.uuid4()),
                            agent=self.name,
                            category="tests",
                            severity=SeverityEnum.INFO,
                            confidence=0.85,
                            title=title,
                            description=f"Exported function '{fn_name}' does not have dedicated automated unit test coverage.",
                            impact="Logic changes may introduce regressions without being caught in CI pipelines.",
                            recommendation="Add unit tests covering successful execution, invalid inputs, and error paths.",
                            filePath=f.path,
                            startLine=line_no,
                            endLine=line_no,
                            codeSnippet=line.strip(),
                            evidence=evidence,
                            suggestedPatch=test_scaffold,
                            sourceType=SourceTypeEnum.LLM,
                            status=FindingStatusEnum.OPEN,
                            fingerprint=fp
                        ))
                        # Limit to at most 2 missing test suggestions per file to avoid noise
                        if len(findings) >= 2:
                            break

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Test analysis recommended {len(findings)} test coverage addition(s)."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=findings,
            summary=summary
        )
