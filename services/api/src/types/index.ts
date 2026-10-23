export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SourceType = 'llm' | 'static_tool' | 'manual_rule';
export type FindingStatus = 'open' | 'dismissed' | 'fixed' | 'accepted_risk';
export type ReviewStatus = 'queued' | 'running' | 'completed' | 'partially_completed' | 'failed' | 'cancelling' | 'cancelled';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface Review {
  id: string;
  owner_user_id: string;
  project_id: string | null;
  title: string;
  source_type: string;
  language: string;
  status: ReviewStatus;
  summary: string | null;
  settings: Record<string, any>;
  provider: string;
  model: string;
  duration_ms: number | null;
  token_usage: Record<string, any> | null;
  error_code: string | null;
  error_message_safe: string | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
}

export interface ReviewFile {
  id: string;
  review_id: string;
  path: string;
  language: string;
  content_hash: string;
  source_content: string | null;
  line_count: number;
}

export interface AgentRun {
  id: string;
  review_id: string;
  agent_name: string;
  status: string;
  attempt: number;
  started_at: Date;
  completed_at: Date | null;
  duration_ms: number;
  model: string | null;
  token_usage: Record<string, any> | null;
  error_code: string | null;
  error_message_safe: string | null;
  output_summary: Record<string, any> | null;
}

export interface Finding {
  id: string;
  review_id: string;
  agent_run_id: string | null;
  agent_name: string;
  category: string;
  severity: Severity;
  confidence: number;
  title: string;
  description: string | null;
  impact: string | null;
  recommendation: string | null;
  file_path: string | null;
  start_line: number | null;
  end_line: number | null;
  code_snippet: string | null;
  evidence: string;
  cwe: string | null;
  suggested_patch: string | null;
  source_type: SourceType;
  fingerprint: string;
  status: FindingStatus;
  created_at: Date;
}

export interface ReviewEvent {
  id: number;
  review_id: string;
  event_type: string;
  agent_name: string | null;
  status: string;
  message_safe: string;
  payload: Record<string, any>;
  created_at: Date;
}
