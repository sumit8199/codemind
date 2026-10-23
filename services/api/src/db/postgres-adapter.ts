import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { IDatabaseAdapter } from './db-interface.js';
import { User, Project, Review, ReviewFile, AgentRun, Finding, ReviewEvent, ReviewStatus } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PostgresDatabaseAdapter implements IDatabaseAdapter {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sql);
      }
    } finally {
      client.release();
    }
  }

  async createUser(data: { id: string; email: string; password_hash: string; display_name?: string | null }): Promise<User> {
    const res = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
       VALUES ($1, LOWER($2), $3, $4, NOW(), NOW())
       RETURNING *`,
      [data.id, data.email, data.password_hash, data.display_name || null]
    );
    return res.rows[0];
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await this.pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query(`SELECT * FROM users WHERE email = LOWER($1)`, [email]);
    return res.rows[0] || null;
  }

  async createProject(data: { id: string; owner_user_id: string; name: string; description?: string | null }): Promise<Project> {
    const res = await this.pool.query(
      `INSERT INTO projects (id, owner_user_id, name, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [data.id, data.owner_user_id, data.name, data.description || null]
    );
    return res.rows[0];
  }

  async getProjectsByUser(userId: string, page = 1, pageSize = 20): Promise<{ projects: Project[]; total: number }> {
    const countRes = await this.pool.query(`SELECT COUNT(*) FROM projects WHERE owner_user_id = $1`, [userId]);
    const total = parseInt(countRes.rows[0].count, 10);
    const offset = (page - 1) * pageSize;

    const res = await this.pool.query(
      `SELECT * FROM projects WHERE owner_user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    return { projects: res.rows, total };
  }

  async getProjectById(id: string, userId: string): Promise<Project | null> {
    const res = await this.pool.query(`SELECT * FROM projects WHERE id = $1 AND owner_user_id = $2`, [id, userId]);
    return res.rows[0] || null;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM projects WHERE id = $1 AND owner_user_id = $2`, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

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
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO reviews (id, owner_user_id, project_id, title, source_type, language, status, settings, provider, model, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          reviewData.id,
          reviewData.owner_user_id,
          reviewData.project_id || null,
          reviewData.title,
          reviewData.source_type,
          reviewData.language,
          reviewData.status,
          JSON.stringify(reviewData.settings),
          reviewData.provider,
          reviewData.model,
        ]
      );
      const review = res.rows[0];

      for (const f of files) {
        await client.query(
          `INSERT INTO review_files (id, review_id, path, language, content_hash, source_content, line_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), review.id, f.path, f.language, f.content_hash, f.source_content, f.line_count]
        );
      }

      await client.query('COMMIT');
      return review;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getReviewById(id: string, userId?: string): Promise<Review | null> {
    const params: any[] = [id];
    let query = `SELECT * FROM reviews WHERE id = $1`;
    if (userId) {
      params.push(userId);
      query += ` AND owner_user_id = $2`;
    }
    const res = await this.pool.query(query, params);
    return res.rows[0] || null;
  }

  async getReviewFiles(reviewId: string): Promise<ReviewFile[]> {
    const res = await this.pool.query(`SELECT * FROM review_files WHERE review_id = $1`, [reviewId]);
    return res.rows;
  }

  async getReviewsByUser(
    userId: string,
    page = 1,
    pageSize = 20,
    status?: string
  ): Promise<{ reviews: Review[]; total: number }> {
    const params: any[] = [userId];
    let filter = `WHERE owner_user_id = $1`;
    if (status) {
      params.push(status);
      filter += ` AND status = $${params.length}`;
    }

    const countRes = await this.pool.query(`SELECT COUNT(*) FROM reviews ${filter}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    const res = await this.pool.query(
      `SELECT * FROM reviews ${filter} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { reviews: res.rows, total };
  }

  async updateReviewStatus(
    id: string,
    status: ReviewStatus,
    summary?: string | null,
    durationMs?: number | null,
    errorCode?: string | null,
    errorMessage?: string | null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE reviews
       SET status = $1,
           summary = COALESCE($2, summary),
           duration_ms = COALESCE($3, duration_ms),
           error_code = COALESCE($4, error_code),
           error_message_safe = COALESCE($5, error_message_safe),
           started_at = CASE WHEN $1 = 'running' AND started_at IS NULL THEN NOW() ELSE started_at END,
           completed_at = CASE WHEN $1 IN ('completed', 'partially_completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $6`,
      [status, summary ?? null, durationMs ?? null, errorCode ?? null, errorMessage ?? null, id]
    );
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM reviews WHERE id = $1 AND owner_user_id = $2`, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

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
    const res = await this.pool.query(
      `INSERT INTO agent_runs (id, review_id, agent_name, status, attempt, started_at, completed_at, duration_ms, model, output_summary, error_code, error_message_safe)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        uuidv4(),
        run.review_id,
        run.agent_name,
        run.status,
        run.attempt,
        run.started_at,
        run.completed_at || null,
        run.duration_ms,
        run.model || null,
        run.output_summary ? JSON.stringify(run.output_summary) : null,
        run.error_code || null,
        run.error_message_safe || null,
      ]
    );
    return res.rows[0];
  }

  async saveFindings(reviewId: string, items: Array<Omit<Finding, 'id' | 'created_at'>>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const f of items) {
        await client.query(
          `INSERT INTO findings (
            id, review_id, agent_run_id, agent_name, category, severity, confidence,
            title, description, impact, recommendation, file_path, start_line, end_line,
            code_snippet, evidence, cwe, suggested_patch, source_type, fingerprint, status, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()
          ) ON CONFLICT (review_id, fingerprint) DO UPDATE
            SET confidence = EXCLUDED.confidence,
                evidence = EXCLUDED.evidence`,
          [
            uuidv4(),
            reviewId,
            f.agent_run_id || null,
            f.agent_name,
            f.category,
            f.severity,
            f.confidence,
            f.title,
            f.description || null,
            f.impact || null,
            f.recommendation || null,
            f.file_path || null,
            f.start_line || null,
            f.end_line || null,
            f.code_snippet || null,
            f.evidence,
            f.cwe || null,
            f.suggested_patch || null,
            f.source_type,
            f.fingerprint,
            f.status,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getFindings(reviewId: string, severity?: string, category?: string): Promise<Finding[]> {
    const params: any[] = [reviewId];
    let query = `SELECT * FROM findings WHERE review_id = $1`;
    if (severity) {
      params.push(severity.toLowerCase());
      query += ` AND LOWER(severity) = $${params.length}`;
    }
    if (category) {
      params.push(category.toLowerCase());
      query += ` AND LOWER(category) = $${params.length}`;
    }
    query += ` ORDER BY CASE severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5 END, confidence DESC`;

    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async getAgentRuns(reviewId: string): Promise<AgentRun[]> {
    const res = await this.pool.query(`SELECT * FROM agent_runs WHERE review_id = $1 ORDER BY started_at ASC`, [reviewId]);
    return res.rows;
  }

  async recordEvent(eventData: {
    review_id: string;
    event_type: string;
    agent_name?: string | null;
    status: string;
    message_safe: string;
    payload?: Record<string, any>;
  }): Promise<ReviewEvent> {
    const res = await this.pool.query(
      `INSERT INTO review_events (review_id, event_type, agent_name, status, message_safe, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        eventData.review_id,
        eventData.event_type,
        eventData.agent_name || null,
        eventData.status,
        eventData.message_safe,
        JSON.stringify(eventData.payload || {}),
      ]
    );
    return res.rows[0];
  }

  async getEvents(reviewId: string): Promise<ReviewEvent[]> {
    const res = await this.pool.query(`SELECT * FROM review_events WHERE review_id = $1 ORDER BY id ASC`, [reviewId]);
    return res.rows;
  }
}
