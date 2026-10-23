export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ReviewStatus = 'queued' | 'running' | 'completed' | 'partially_completed' | 'failed' | 'cancelling' | 'cancelled';

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ReviewFile {
  path: string;
  line_count: number;
}

export interface AgentRun {
  id?: string;
  agent_name: string;
  status: string;
  duration_ms: number;
  model?: string;
  summary?: string;
  output_summary?: Record<string, any>;
  error_code?: string;
  error_message_safe?: string;
}

export interface Finding {
  id: string;
  agent: string;
  category: string;
  severity: Severity;
  confidence: number;
  title: string;
  description: string | null;
  impact: string | null;
  recommendation: string | null;
  filePath: string | null;
  startLine: number | null;
  endLine: number | null;
  codeSnippet: string | null;
  evidence: string;
  cwe: string | null;
  suggestedPatch: string | null;
  sourceType: string;
  status: string;
  fingerprint: string;
}

export interface Review {
  id: string;
  title: string;
  language: string;
  status: ReviewStatus;
  summary: string | null;
  severityCounts?: SeverityCounts;
  provider?: string;
  model?: string;
  durationMs?: number;
  files?: ReviewFile[];
  agentRuns?: AgentRun[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewEvent {
  reviewId: string;
  agentName: string | null;
  status: string;
  message: string;
  timestamp: string;
  payload?: Record<string, any>;
}
