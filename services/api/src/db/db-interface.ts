import { User, Project, Review, ReviewFile, AgentRun, Finding, ReviewEvent, ReviewStatus } from '../types/index.js';

export interface IDatabaseAdapter {
  init(): Promise<void>;
  
  // Users
  createUser(user: { id: string; email: string; password_hash: string; display_name?: string | null }): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;

  // Projects
  createProject(project: { id: string; owner_user_id: string; name: string; description?: string | null }): Promise<Project>;
  getProjectsByUser(userId: string, page?: number, pageSize?: number): Promise<{ projects: Project[]; total: number }>;
  getProjectById(id: string, userId: string): Promise<Project | null>;
  deleteProject(id: string, userId: string): Promise<boolean>;

  // Reviews
  createReview(
    review: {
      id: string;
      owner_user_id: string;
      project_id?: string | null;
      title: string;
      source_type: string;
      language: string;
      status: ReviewStatus;
      settings: Record<string, any>;
      provider: string;
      model: string;
    },
    files: Array<{
      path: string;
      language: string;
      content_hash: string;
      source_content: string | null;
      line_count: number;
    }>
  ): Promise<Review>;

  getReviewById(id: string, userId?: string): Promise<Review | null>;
  getReviewFiles(reviewId: string): Promise<ReviewFile[]>;
  getReviewsByUser(
    userId: string,
    page?: number,
    pageSize?: number,
    status?: string
  ): Promise<{ reviews: Review[]; total: number }>;

  updateReviewStatus(
    id: string,
    status: ReviewStatus,
    summary?: string | null,
    durationMs?: number | null,
    errorCode?: string | null,
    errorMessage?: string | null
  ): Promise<void>;

  deleteReview(id: string, userId: string): Promise<boolean>;

  // Agent Runs & Findings
  saveAgentRun(run: {
    review_id: string;
    agent_name: string;
    status: string;
    attempt: number;
    started_at: Date;
    completed_at?: Date | null;
    duration_ms: number;
    model?: string | null;
    output_summary?: Record<string, any> | null;
    error_code?: string | null;
    error_message_safe?: string | null;
  }): Promise<AgentRun>;

  saveFindings(reviewId: string, findings: Array<Omit<Finding, 'id' | 'created_at'>>): Promise<void>;
  getFindings(reviewId: string, severity?: string, category?: string): Promise<Finding[]>;
  getAgentRuns(reviewId: string): Promise<AgentRun[]>;

  // Events (SSE / recovery)
  recordEvent(event: {
    review_id: string;
    event_type: string;
    agent_name?: string | null;
    status: string;
    message_safe: string;
    payload?: Record<string, any>;
  }): Promise<ReviewEvent>;

  getEvents(reviewId: string): Promise<ReviewEvent[]>;
}
