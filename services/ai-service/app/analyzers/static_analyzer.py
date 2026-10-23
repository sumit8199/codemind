import re
import uuid
from typing import List
from app.models import Finding, ReviewFile, SeverityEnum, SourceTypeEnum, FindingStatusEnum
from app.fingerprint import generate_finding_fingerprint


class StaticAnalyzer:
    """
    Deterministic static code analysis tool that safely inspects submitted source
    without ever executing the code on the host system.
    """

    PATTERNS = [
        {
            "name": "Hardcoded Secret / API Key",
            "regex": re.compile(r"""(?i)(?:api_key|secret|password|passwd|auth_token)\s*[:=]\s*["']([A-Za-z0-9_-]{8,})["']"""),
            "category": "security",
            "severity": SeverityEnum.HIGH,
            "confidence": 0.95,
            "cwe": "CWE-798",
            "description": "Hardcoded credential or secret detected in source file.",
            "impact": "Exposing secrets in code repositories may lead to unauthorized access and security breaches.",
            "recommendation": "Extract secrets into environment variables or a secure key management system.",
            "patch": "// Use process.env or secret manager instead of hardcoded credential"
        },
        {
            "name": "SQL String Concatenation (Potential SQL Injection)",
            "regex": re.compile(r"""(?i)(?:select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from).*(?:\+|`.*\$\{)"""),
            "category": "security",
            "severity": SeverityEnum.CRITICAL,
            "confidence": 0.92,
            "cwe": "CWE-89",
            "description": "Potential dynamic SQL construction via string concatenation or template literals.",
            "impact": "Attackers can manipulate the query structure to read, modify, or delete database contents.",
            "recommendation": "Use parameterized queries, prepared statements, or an ORM query builder.",
            "patch": "// Example parameterized query: client.query('SELECT * FROM users WHERE id = $1', [userId]);"
        },
        {
            "name": "Unsafe Dynamic Code Execution (eval)",
            "regex": re.compile(r"""\b(?:eval|new\s+Function)\s*\("""),
            "category": "security",
            "severity": SeverityEnum.CRITICAL,
            "confidence": 0.98,
            "cwe": "CWE-95",
            "description": "Use of eval() or new Function() allows dynamic code execution from strings.",
            "impact": "Untrusted input passed to dynamic evaluation leads to Arbitrary Code Execution (ACE/RCE).",
            "recommendation": "Refactor logic to use native data structures, JSON.parse, or declarative mapping.",
            "patch": "const safeData = JSON.parse(input);"
        },
        {
            "name": "Dangerous DOM Injection (innerHTML)",
            "regex": re.compile(r"""\.(?:innerHTML|outerHTML)\s*="""),
            "category": "security",
            "severity": SeverityEnum.HIGH,
            "confidence": 0.90,
            "cwe": "CWE-79",
            "description": "Direct assignment to innerHTML without sanitization can cause Cross-Site Scripting (XSS).",
            "impact": "Malicious scripts can be injected and executed in client browsers.",
            "recommendation": "Use textContent, innerText, or a sanitization library like DOMPurify before DOM insertion.",
            "patch": "element.textContent = safeContent;"
        },
        {
            "name": "Cryptographically Insecure Random Generator",
            "regex": re.compile(r"""\bMath\.random\s*\(\)"""),
            "category": "security",
            "severity": SeverityEnum.LOW,
            "confidence": 0.85,
            "cwe": "CWE-330",
            "description": "Math.random() is pseudorandom and predictable, unsuitable for tokens, IDs, or security contexts.",
            "impact": "Tokens generated using Math.random() can be predicted by an attacker.",
            "recommendation": "Use crypto.randomBytes() or crypto.getRandomValues() for cryptographic randomness.",
            "patch": "import crypto from 'crypto';\nconst token = crypto.randomBytes(32).toString('hex');"
        },
        {
            "name": "Empty or Suppressed Catch Block",
            "regex": re.compile(r"""catch\s*\([^)]*\)\s*\{\s*\}"""),
            "category": "quality",
            "severity": SeverityEnum.MEDIUM,
            "confidence": 0.95,
            "cwe": "CWE-391",
            "description": "Silently swallowing exceptions prevents proper error recovery and hides failures.",
            "impact": "Failures fail silently, complicating debugging and leaving systems in inconsistent states.",
            "recommendation": "Log the error with structured context and rethrow or return an explicit error result.",
            "patch": "catch (err) {\n  logger.error('Operation failed', { error: err });\n  throw err;\n}"
        },
        {
            "name": "Non-Concurrent Index Creation in Migration DDL",
            "regex": re.compile(r"""(?i)\bcreate\s+(?:unique\s+)?index\s+(?!concurrently\b)"""),
            "category": "migration",
            "severity": SeverityEnum.HIGH,
            "confidence": 0.97,
            "cwe": "CWE-400",
            "description": "Creating an index without CONCURRENTLY locks the table against write transactions.",
            "impact": "Production table write lock causing connection pool queueing and user request timeouts.",
            "recommendation": "Use CREATE INDEX CONCURRENTLY outside a transaction block.",
            "patch": "CREATE INDEX CONCURRENTLY idx_name ON table_name (column_name);"
        },
        {
            "name": "Destructive Table or Column Drop (Data Loss Risk)",
            "regex": re.compile(r"""(?i)\balter\s+table\s+.+\s+drop\s+column\b|\bdrop\s+table\b"""),
            "category": "migration",
            "severity": SeverityEnum.CRITICAL,
            "confidence": 0.99,
            "cwe": "CWE-284",
            "description": "DROP COLUMN or DROP TABLE causes irreversible data deletion and breaks active application instances.",
            "impact": "Immediate permanent data loss and 500 runtime exceptions during rolling updates.",
            "recommendation": "Follow expand-contract: deprecate column in code first, deploy, then safely archive and drop.",
            "patch": "-- Deprecate in application code first, then drop in subsequent maintenance window"
        }
    ]

    @classmethod
    def analyze_file(cls, file: ReviewFile) -> List[Finding]:
        findings: List[Finding] = []
        lines = file.content.splitlines()

        for idx, line in enumerate(lines):
            line_no = idx + 1
            for rule in cls.PATTERNS:
                match = rule["regex"].search(line)
                if match:
                    snippet = line.strip()
                    title = rule["name"]
                    category = rule["category"]
                    severity = rule["severity"]
                    confidence = rule["confidence"]
                    cwe = rule.get("cwe")
                    desc = rule["description"]
                    impact = rule["impact"]
                    rec = rule["recommendation"]
                    patch = rule.get("patch")
                    
                    evidence = f"Pattern match '{match.group(0)[:60]}' at line {line_no} of {file.path}"
                    fingerprint = generate_finding_fingerprint(
                        category=category,
                        file_path=file.path,
                        start_line=line_no,
                        end_line=line_no,
                        title=title
                    )

                    findings.append(Finding(
                        id=str(uuid.uuid4()),
                        agent="static_analyzer",
                        category=category,
                        severity=severity,
                        confidence=confidence,
                        title=title,
                        description=desc,
                        impact=impact,
                        recommendation=rec,
                        filePath=file.path,
                        startLine=line_no,
                        endLine=line_no,
                        codeSnippet=snippet,
                        evidence=evidence,
                        cwe=cwe,
                        suggestedPatch=patch,
                        sourceType=SourceTypeEnum.STATIC_TOOL,
                        status=FindingStatusEnum.OPEN,
                        fingerprint=fingerprint
                    ))
        return findings
