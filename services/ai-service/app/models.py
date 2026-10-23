from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SeverityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class SourceTypeEnum(str, Enum):
    LLM = "llm"
    STATIC_TOOL = "static_tool"
    MANUAL_RULE = "manual_rule"


class FindingStatusEnum(str, Enum):
    OPEN = "open"
    DISMISSED = "dismissed"
    FIXED = "fixed"
    ACCEPTED_RISK = "accepted_risk"


class ReviewFile(BaseModel):
    path: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., max_length=1000000)


class ReviewRequest(BaseModel):
    review_id: str
    language: str = "typescript"
    categories: List[str] = Field(default_factory=lambda: ["bugs", "security", "performance", "quality", "tests"])
    files: List[ReviewFile] = Field(..., min_length=1, max_length=50)


class Finding(BaseModel):
    id: str
    agent: str
    category: str
    severity: SeverityEnum
    confidence: float = Field(..., ge=0.0, le=1.0)
    title: str
    description: str
    impact: str
    recommendation: str
    filePath: Optional[str] = None
    startLine: Optional[int] = None
    endLine: Optional[int] = None
    codeSnippet: Optional[str] = None
    evidence: str
    cwe: Optional[str] = None
    suggestedPatch: Optional[str] = None
    sourceType: SourceTypeEnum = SourceTypeEnum.LLM
    status: FindingStatusEnum = FindingStatusEnum.OPEN
    fingerprint: str


class AgentRun(BaseModel):
    agent_name: str
    status: str  # "completed", "failed", "skipped"
    attempt: int = 1
    duration_ms: int = 0
    model: Optional[str] = None
    findings: List[Finding] = Field(default_factory=list)
    summary: Optional[str] = None
    output_summary: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    error_message_safe: Optional[str] = None


class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class ReviewResponse(BaseModel):
    review_id: str
    status: str  # "completed", "partially_completed", "failed"
    summary: Optional[str] = None
    severity_counts: SeverityCounts
    agent_runs: List[AgentRun]
    findings: List[Finding]
    provider: str
    model: str
