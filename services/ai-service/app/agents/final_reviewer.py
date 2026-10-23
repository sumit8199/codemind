import time
from typing import List, Dict, Any, Tuple
from app.models import Finding, AgentRun, SeverityCounts, SeverityEnum


class FinalReviewer:
    """
    Consolidates findings from all specialized agents and static analyzers.
    Deduplicates overlapping issues using fingerprints, sorts findings by severity,
    and calculates final metric counts.
    """

    SEVERITY_ORDER = {
        SeverityEnum.CRITICAL: 0,
        SeverityEnum.HIGH: 1,
        SeverityEnum.MEDIUM: 2,
        SeverityEnum.LOW: 3,
        SeverityEnum.INFO: 4,
    }

    @classmethod
    def consolidate(
        cls,
        agent_runs: List[AgentRun],
        static_findings: List[Finding],
        review_id: str
    ) -> Tuple[List[Finding], SeverityCounts, str]:
        # Merge all raw findings
        all_findings: List[Finding] = []
        for run in agent_runs:
            all_findings.extend(run.findings)
        all_findings.extend(static_findings)

        # Deduplicate using fingerprint
        unique_findings_map: Dict[str, Finding] = {}
        for f in all_findings:
            fp = f.fingerprint
            if fp not in unique_findings_map:
                unique_findings_map[fp] = f
            else:
                existing = unique_findings_map[fp]
                # If duplicate, keep finding with higher confidence and merge evidence
                if f.confidence > existing.confidence:
                    f.evidence = f"{f.evidence} | Secondary agent confirmed: {existing.agent}"
                    unique_findings_map[fp] = f
                else:
                    existing.evidence = f"{existing.evidence} | Secondary agent confirmed: {f.agent}"

        consolidated = list(unique_findings_map.values())

        # Sort by severity priority (critical first) then confidence (highest first)
        consolidated.sort(
            key=lambda x: (
                cls.SEVERITY_ORDER.get(x.severity, 99),
                -x.confidence
            )
        )

        # Calculate counts
        counts = SeverityCounts()
        for f in consolidated:
            if f.severity == SeverityEnum.CRITICAL:
                counts.critical += 1
            elif f.severity == SeverityEnum.HIGH:
                counts.high += 1
            elif f.severity == SeverityEnum.MEDIUM:
                counts.medium += 1
            elif f.severity == SeverityEnum.LOW:
                counts.low += 1
            elif f.severity == SeverityEnum.INFO:
                counts.info += 1

        # Generate summary
        total = len(consolidated)
        if total == 0:
            summary = "CodeMind AI analysis completed. No critical vulnerabilities or defects detected in submitted source."
        else:
            summary = (
                f"CodeMind AI multi-agent analysis identified {total} finding(s): "
                f"{counts.critical} critical, {counts.high} high, {counts.medium} medium, "
                f"{counts.low} low, and {counts.info} informational."
            )

        return consolidated, counts, summary
