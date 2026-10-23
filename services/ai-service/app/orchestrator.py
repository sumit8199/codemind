import asyncio
import time
import uuid
import logging
from typing import List, Dict, Any
from app.models import (
    ReviewRequest,
    ReviewResponse,
    AgentRun,
    Finding,
    SeverityCounts,
    ReviewFile
)
from app.config import settings
from app.agents.context_agent import ContextAgent
from app.agents.bug_agent import BugAgent
from app.agents.security_agent import SecurityAgent
from app.agents.performance_agent import PerformanceAgent
from app.agents.quality_agent import QualityAgent
from app.agents.coverage_agent import TestAgent
from app.agents.final_reviewer import FinalReviewer
from app.analyzers.static_analyzer import StaticAnalyzer

logger = logging.getLogger("orchestrator")


class ReviewWorkflowOrchestrator:
    """
    State Graph Workflow Orchestrator for CodeMind AI.
    Executes context extraction, launches independent analysis agents concurrently,
    runs deterministic static analysis, and merges results via the Final Reviewer.
    """

    def __init__(self):
        self.context_agent = ContextAgent()
        self.agents_map = {
            "bugs": BugAgent(),
            "security": SecurityAgent(),
            "performance": PerformanceAgent(),
            "quality": QualityAgent(),
            "tests": TestAgent(),
        }

    async def _run_agent_with_timeout(
        self,
        agent,
        files: List[ReviewFile],
        language: str,
        context: Dict[str, Any],
        provider: str,
        model: str,
        timeout: int
    ) -> AgentRun:
        start_time = time.time()
        try:
            return await asyncio.wait_for(
                agent.analyze(files, language, context, provider=provider, model=model),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Agent {agent.name} timed out after {timeout}s")
            return AgentRun(
                agent_name=agent.name,
                status="failed",
                attempt=1,
                duration_ms=duration_ms,
                model=model,
                findings=[],
                summary=f"Analysis timed out after {timeout} seconds",
                error_code="TIMEOUT",
                error_message_safe="Agent analysis timed out"
            )
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Agent {agent.name} failed: {exc}", exc_info=True)
            return AgentRun(
                agent_name=agent.name,
                status="failed",
                attempt=1,
                duration_ms=duration_ms,
                model=model,
                findings=[],
                summary="Agent encountered an error during analysis",
                error_code="EXECUTION_ERROR",
                error_message_safe=str(exc)[:200]
            )

    async def execute_review(self, request: ReviewRequest) -> ReviewResponse:
        provider = settings.AI_PROVIDER
        model = settings.AI_MODEL
        timeout = settings.AGENT_TIMEOUT_SECONDS

        agent_runs: List[AgentRun] = []
        static_findings: List[Finding] = []

        # Step 1: Run Context Agent
        context_run = await self._run_agent_with_timeout(
            self.context_agent,
            request.files,
            request.language,
            {},
            provider,
            model,
            timeout
        )
        agent_runs.append(context_run)
        context_data = context_run.output_summary or {}

        # Step 2: Concurrently run requested category agents
        tasks = []
        for cat in request.categories:
            cat_key = cat.lower().strip()
            if cat_key in self.agents_map:
                agent = self.agents_map[cat_key]
                tasks.append(
                    self._run_agent_with_timeout(
                        agent,
                        request.files,
                        request.language,
                        context_data,
                        provider,
                        model,
                        timeout
                    )
                )

        if tasks:
            concurrent_runs = await asyncio.gather(*tasks)
            agent_runs.extend(concurrent_runs)

        # Step 3: Run Deterministic Static Analyzer across all files
        for f in request.files:
            file_findings = StaticAnalyzer.analyze_file(f)
            static_findings.extend(file_findings)

        if static_findings:
            static_run = AgentRun(
                agent_name="static_analyzer",
                status="completed",
                attempt=1,
                duration_ms=5,
                model="deterministic_rules_v1",
                findings=static_findings,
                summary=f"Deterministic analyzer reported {len(static_findings)} issue(s)."
            )
            agent_runs.append(static_run)

        # Step 4: Final Reviewer consolidation & deduplication
        findings, counts, summary = FinalReviewer.consolidate(
            agent_runs=agent_runs,
            static_findings=[],
            review_id=request.review_id
        )

        # Determine overall workflow status
        failed_count = sum(1 for r in agent_runs if r.status == "failed")
        if failed_count == 0:
            status = "completed"
        elif failed_count < len(agent_runs):
            status = "partially_completed"
        else:
            status = "failed"

        return ReviewResponse(
            review_id=request.review_id,
            status=status,
            summary=summary,
            severity_counts=counts,
            agent_runs=agent_runs,
            findings=findings,
            provider=provider,
            model=model
        )


orchestrator = ReviewWorkflowOrchestrator()
