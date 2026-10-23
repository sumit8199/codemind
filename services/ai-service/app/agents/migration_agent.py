import time
import uuid
import re
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.models import ReviewFile, Finding, AgentRun, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class MigrationAgent(BaseAgent):
    """
    Database Migration Query Safety Agent.
    Analyzes SQL migrations, DDL statements, and schema changes for:
    - Exclusive table locking hazards (production downtime)
    - Data loss / destructive operations (DROP TABLE / DROP COLUMN)
    - Unindexed foreign key constraints causing cascade scan locks
    - Missing lock_timeout configurations
    - Zero-downtime expand/contract schema evolution compliance
    """

    def __init__(self):
        super().__init__(name="migration_agent")

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
            full_text = f.content.lower()

            # Rule 1: Missing lock_timeout in migration script
            if ("alter table" in full_text or "create index" in full_text) and "lock_timeout" not in full_text:
                title = "Missing lock_timeout Setting in Migration DDL"
                fp = generate_finding_fingerprint("migration", f.path, 1, 1, title)
                findings.append(Finding(
                    id=str(uuid.uuid4()),
                    agent=self.name,
                    category="migration",
                    severity=SeverityEnum.MEDIUM,
                    confidence=0.90,
                    title=title,
                    description="Executing DDL without a lock_timeout can queue behind slow queries and block subsequent reads and writes.",
                    impact="Can quickly exhaust database connection pool and cause complete service outage.",
                    recommendation="Set a strict lock_timeout at the beginning of the migration script (e.g., SET lock_timeout = '2s';).",
                    filePath=f.path,
                    startLine=1,
                    endLine=1,
                    codeSnippet=lines[0] if lines else "-- migration script",
                    evidence="No 'SET lock_timeout' found in DDL migration file",
                    cwe="CWE-400",
                    suggestedPatch="SET lock_timeout = '2s';\nSET statement_timeout = '30s';",
                    sourceType=SourceTypeEnum.LLM,
                    status=FindingStatusEnum.OPEN,
                    fingerprint=fp
                ))

            for idx, line in enumerate(lines):
                line_no = idx + 1
                stripped = line.strip()

                # Rule 2: Non-concurrent Index Creation (Locks table writes)
                if re.search(r"(?i)\bcreate\s+(?:unique\s+)?index\s+(?!concurrently\b)", stripped):
                    title = "Non-Concurrent Index Creation Blocks Production Writes"
                    evidence = f"Statement '{stripped}' at line {line_no} creates index without CONCURRENTLY"
                    fp = generate_finding_fingerprint("migration", f.path, line_no, line_no, title)
                    patch = re.sub(r"(?i)\bcreate\s+(unique\s+)?index\b", r"CREATE \1INDEX CONCURRENTLY", stripped)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="migration",
                        severity=SeverityEnum.HIGH,
                        confidence=0.96,
                        title=title,
                        description="In PostgreSQL, CREATE INDEX acquires a SHARE lock that prevents all INSERT, UPDATE, and DELETE queries on the target table until the index is fully constructed.",
                        impact="Severe production latency spike and connection pool starvation on busy tables.",
                        recommendation="Use CREATE INDEX CONCURRENTLY outside a transaction block.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=stripped,
                        evidence=evidence,
                        cwe="CWE-400",
                        suggestedPatch=patch,
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Rule 3: Destructive DROP COLUMN / DROP TABLE
                if re.search(r"(?i)\balter\s+table\s+.+\s+drop\s+column\b|\bdrop\s+table\b", stripped):
                    title = "Destructive Schema Deletion (Irrevocable Data Loss)"
                    evidence = f"Destructive statement '{stripped}' at line {line_no}"
                    fp = generate_finding_fingerprint("migration", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="migration",
                        severity=SeverityEnum.CRITICAL,
                        confidence=0.98,
                        title=title,
                        description="Dropping a column or table in production deletes all stored records instantly and breaks any active application code expecting that column.",
                        impact="Catastrophic data loss and immediate 500 runtime errors during rolling zero-downtime deployments.",
                        recommendation="Adopt the expand-contract pattern: deprecate the column in application code, deploy, confirm 0 reads/writes, then archive and drop.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=stripped,
                        evidence=evidence,
                        cwe="CWE-284",
                        suggestedPatch="-- Step 1: Remove column usage from application code\n-- Step 2: Deploy code\n-- Step 3: Run standalone cleanup migration",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Rule 4: ADD COLUMN NOT NULL without DEFAULT
                if re.search(r"(?i)\balter\s+table\s+.+\s+add\s+(?:column\s+)?[a-z0-9_]+\s+[a-z0-9_()]+\s+not\s+null(?!\s+default\b)", stripped):
                    title = "Adding NOT NULL Column Without DEFAULT Value"
                    evidence = f"Constraint '{stripped}' at line {line_no} lacks a default value"
                    fp = generate_finding_fingerprint("migration", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="migration",
                        severity=SeverityEnum.HIGH,
                        confidence=0.95,
                        title=title,
                        description="Adding a NOT NULL column without a DEFAULT will fail instantly if the table contains existing rows, or take an exclusive write lock on older databases.",
                        impact="Migration failure, rollback failure, and table locking.",
                        recommendation="Add as nullable first, backfill in batches, then attach NOT NULL with VALIDATE constraint.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=stripped,
                        evidence=evidence,
                        cwe="CWE-400",
                        suggestedPatch="-- 1. Add nullable:\nALTER TABLE my_table ADD COLUMN col_name TYPE;\n-- 2. Backfill rows...\n-- 3. Add constraint:\nALTER TABLE my_table ADD CONSTRAINT col_name_not_null CHECK (col_name IS NOT NULL) NOT VALID;\nALTER TABLE my_table VALIDATE CONSTRAINT col_name_not_null;",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Rule 5: Unindexed Foreign Key Constraint
                if re.search(r"(?i)\badd\s+constraint\s+.+\s+foreign\s+key\s*\(([a-z0-9_]+)\)", stripped):
                    col_match = re.search(r"(?i)\bforeign\s+key\s*\(([a-z0-9_]+)\)", stripped)
                    col_name = col_match.group(1) if col_match else "foreign_key_col"
                    title = f"Unindexed Foreign Key on '{col_name}'"
                    evidence = f"Foreign key constraint defined at line {line_no} without index"
                    fp = generate_finding_fingerprint("migration", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="migration",
                        severity=SeverityEnum.MEDIUM,
                        confidence=0.88,
                        title=title,
                        description="Foreign keys without a supporting index cause full table scans and share locks on the child table when parent rows are updated or deleted.",
                        impact="Parent table deletes will block all transactions on the child table, causing cascade performance collapse.",
                        recommendation=f"Add a concurrent index on the foreign key column '{col_name}'.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=stripped,
                        evidence=evidence,
                        cwe="CWE-400",
                        suggestedPatch=f"CREATE INDEX CONCURRENTLY idx_table_{col_name} ON table_name ({col_name});",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

                # Rule 6: Renaming column directly
                if re.search(r"(?i)\balter\s+table\s+.+\s+rename\s+column\b", stripped):
                    title = "Direct Column Rename Breaks Zero-Downtime Deployments"
                    evidence = f"Column rename '{stripped}' at line {line_no}"
                    fp = generate_finding_fingerprint("migration", f.path, line_no, line_no, title)
                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent=self.name,
                        category="migration",
                        severity=SeverityEnum.HIGH,
                        confidence=0.92,
                        title=title,
                        description="Renaming a column directly causes immediate downtime because older application pods still query the old column name while newer pods query the new one.",
                        impact="500 errors and query failures for users during rolling deployments.",
                        recommendation="Add new column, sync data with database trigger or dual-write, then drop old column after full deployment.",
                        filePath=f.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=stripped,
                        evidence=evidence,
                        cwe="CWE-400",
                        suggestedPatch="-- Use Expand-Contract Dual-Write Pattern:\n-- 1. ADD new_column\n-- 2. Dual-write in application\n-- 3. Backfill old rows\n-- 4. Switch reads to new_column\n-- 5. Drop old_column",
                        sourceType=SourceTypeEnum.LLM,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fp
                    ))

        duration_ms = int((time.time() - start_time) * 1000)
        summary = f"Migration Query Checker analyzed schema changes and identified {len(findings)} potential migration hazard(s)."

        return AgentRun(
            agent_name=self.name,
            status="completed",
            attempt=1,
            duration_ms=duration_ms,
            model=model,
            findings=findings,
            summary=summary
        )
