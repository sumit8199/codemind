import { v4 as uuidv4 } from 'uuid';
import { IDatabaseAdapter } from './db-interface.js';
import { User, Project, Review, ReviewFile, AgentRun, Finding, ReviewEvent, ReviewStatus } from '../types/index.js';

export class MemoryDatabaseAdapter implements IDatabaseAdapter {
  private users = new Map<string, User>();
  private projects = new Map<string, Project>();
  private reviews = new Map<string, Review>();
  private reviewFiles = new Map<string, ReviewFile[]>();
  private agentRuns = new Map<string, AgentRun[]>();
  private findings = new Map<string, Finding[]>();
  private events = new Map<string, ReviewEvent[]>();
  private eventIdSeq = 1;

  async init(): Promise<void> {
    // Seed default test user if empty
    if (this.users.size === 0) {
      const defaultUser: User = {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'developer@codemind.ai',
        // pre-hashed "password123"
        password_hash: '$2a$10$wKrnqN6fG7dGvhqU92mOFeQO7O07fQd4Jv2w0w5k/9i3m4h.G.q2.',
        display_name: 'CodeMind Developer',
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.users.set(defaultUser.id, defaultUser);
    }
  }

  // Users
  async createUser(data: { id: string; email: string; password_hash: string; display_name?: string | null }): Promise<User> {
    const user: User = {
      id: data.id,
      email: data.email.toLowerCase(),
      password_hash: data.password_hash,
      display_name: data.display_name || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const lower = email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.email === lower) return u;
    }
    return null;
  }

  // Projects
  async createProject(data: { id: string; owner_user_id: string; name: string; description?: string | null }): Promise<Project> {
    const project: Project = {
      id: data.id,
      owner_user_id: data.owner_user_id,
      name: data.name,
      description: data.description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async getProjectsByUser(userId: string, page = 1, pageSize = 20): Promise<{ projects: Project[]; total: number }> {
    const userProjects = Array.from(this.projects.values())
      .filter((p) => p.owner_user_id === userId)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

    const total = userProjects.length;
    const start = (page - 1) * pageSize;
    const projects = userProjects.slice(start, start + pageSize);
    return { projects, total };
  }

  async getProjectById(id: string, userId: string): Promise<Project | null> {
    const p = this.projects.get(id);
    if (!p || p.owner_user_id !== userId) return null;
    return p;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const p = this.projects.get(id);
    if (!p || p.owner_user_id !== userId) return false;
    this.projects.delete(id);
    return true;
  }

  // Reviews
  async createReview(
    reviewData: {
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
  ): Promise<Review> {
    const now = new Date();
    const review: Review = {
      id: reviewData.id,
      owner_user_id: reviewData.owner_user_id,
      project_id: reviewData.project_id || null,
      title: reviewData.title,
      source_type: reviewData.source_type,
      language: reviewData.language,
      status: reviewData.status,
      summary: null,
      settings: reviewData.settings,
      provider: reviewData.provider,
      model: reviewData.model,
      duration_ms: null,
      token_usage: null,
      error_code: null,
      error_message_safe: null,
      created_at: now,
      started_at: null,
      completed_at: null,
      updated_at: now,
    };
    this.reviews.set(review.id, review);

    const storedFiles: ReviewFile[] = files.map((f) => ({
      id: uuidv4(),
      review_id: review.id,
      path: f.path,
      language: f.language,
      content_hash: f.content_hash,
      source_content: f.source_content,
      line_count: f.line_count,
    }));
    this.reviewFiles.set(review.id, storedFiles);

    return review;
  }

  async getReviewById(id: string, userId?: string): Promise<Review | null> {
    const r = this.reviews.get(id);
    if (!r) return null;
    if (userId && r.owner_user_id !== userId) return null;
    return r;
  }

  async getReviewFiles(reviewId: string): Promise<ReviewFile[]> {
    return this.reviewFiles.get(reviewId) || [];
  }

  async getReviewsByUser(
    userId: string,
    page = 1,
    pageSize = 20,
    status?: string
  ): Promise<{ reviews: Review[]; total: number }> {
    let list = Array.from(this.reviews.values()).filter((r) => r.owner_user_id === userId);
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const total = list.length;
    const start = (page - 1) * pageSize;
    const reviews = list.slice(start, start + pageSize);
    return { reviews, total };
  }

  async updateReviewStatus(
    id: string,
    status: ReviewStatus,
    summary?: string | null,
    durationMs?: number | null,
    errorCode?: string | null,
    errorMessage?: string | null
  ): Promise<void> {
    const r = this.reviews.get(id);
    if (!r) return;

    r.status = status;
    r.updated_at = new Date();
    if (status === 'running' && !r.started_at) {
      r.started_at = new Date();
    }
    if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(status)) {
      r.completed_at = new Date();
    }
    if (summary !== undefined) r.summary = summary;
    if (durationMs !== undefined) r.duration_ms = durationMs;
    if (errorCode !== undefined) r.error_code = errorCode;
    if (errorMessage !== undefined) r.error_message_safe = errorMessage;
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    const r = this.reviews.get(id);
    if (!r || r.owner_user_id !== userId) return false;
    this.reviews.delete(id);
    this.reviewFiles.delete(id);
    this.agentRuns.delete(id);
    this.findings.delete(id);
    this.events.delete(id);
    return true;
  }

  // Agent Runs & Findings
  async saveAgentRun(run: {
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
  }): Promise<AgentRun> {
    const agentRun: AgentRun = {
      id: uuidv4(),
      review_id: run.review_id,
      agent_name: run.agent_name,
      status: run.status,
      attempt: run.attempt,
      started_at: run.started_at,
      completed_at: run.completed_at || null,
      duration_ms: run.duration_ms,
      model: run.model || null,
      token_usage: null,
      error_code: run.error_code || null,
      error_message_safe: run.error_message_safe || null,
      output_summary: run.output_summary || null,
    };

    const existing = this.agentRuns.get(run.review_id) || [];
    existing.push(agentRun);
    this.agentRuns.set(run.review_id, existing);
    return agentRun;
  }

  async saveFindings(reviewId: string, items: Array<Omit<Finding, 'id' | 'created_at'>>): Promise<void> {
    const list: Finding[] = items.map((f) => ({
      ...f,
      id: uuidv4(),
      created_at: new Date(),
    }));
    this.findings.set(reviewId, list);
  }

  async getFindings(reviewId: string, severity?: string, category?: string): Promise<Finding[]> {
    let list = this.findings.get(reviewId) || [];
    if (severity) {
      list = list.filter((f) => f.severity.toLowerCase() === severity.toLowerCase());
    }
    if (category) {
      list = list.filter((f) => f.category.toLowerCase() === category.toLowerCase());
    }
    return list;
  }

  async getAgentRuns(reviewId: string): Promise<AgentRun[]> {
    return this.agentRuns.get(reviewId) || [];
  }

  // Events
  async recordEvent(eventData: {
    review_id: string;
    event_type: string;
    agent_name?: string | null;
    status: string;
    message_safe: string;
    payload?: Record<string, any>;
  }): Promise<ReviewEvent> {
    const event: ReviewEvent = {
      id: this.eventIdSeq++,
      review_id: eventData.review_id,
      event_type: eventData.event_type,
      agent_name: eventData.agent_name || null,
      status: eventData.status,
      message_safe: eventData.message_safe,
      payload: eventData.payload || {},
      created_at: new Date(),
    };

    const list = this.events.get(eventData.review_id) || [];
    list.push(event);
    this.events.set(eventData.review_id, list);
    return event;
  }

  async getEvents(reviewId: string): Promise<ReviewEvent[]> {
    return this.events.get(reviewId) || [];
  }
}
