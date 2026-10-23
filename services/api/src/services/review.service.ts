import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { AIClientService } from './ai-client.service.js';
import { SSEService } from './sse.service.js';
import { Review, Finding, SeverityCounts, ReviewStatus } from '../types/index.js';
import { CreateReviewInput } from '../schemas/review.schema.js';

export class ReviewService {
  static async createReview(userId: string, input: CreateReviewInput): Promise<Review> {
    const db = await getDatabase();
    const reviewId = uuidv4();

    const preparedFiles = input.files.map((f) => {
      const contentHash = crypto.createHash('sha256').update(f.content).digest('hex');
      const lineCount = f.content.split('\n').length;
      return {
        path: f.path,
        language: input.language,
        content_hash: contentHash,
        source_content: f.content,
        line_count: lineCount,
      };
    });

    const review = await db.createReview(
      {
        id: reviewId,
        owner_user_id: userId,
        project_id: input.projectId || null,
        title: input.title,
        source_type: input.sourceType,
        language: input.language,
        status: 'queued',
        settings: { categories: input.categories },
        provider: 'mock',
        model: 'mock-agent-v1',
      },
      preparedFiles
    );

    await SSEService.broadcastEvent(reviewId, null, 'queued', 'Review request queued for analysis');

    // Trigger analysis asynchronously in background
    setImmediate(() => {
      this.executeReviewJob(reviewId).catch((err) => {
        console.error(`Error executing review job ${reviewId}:`, err);
      });
    });

    return review;
  }

  static async executeReviewJob(reviewId: string): Promise<void> {
    const db = await getDatabase();
    const review = await db.getReviewById(reviewId);
    if (!review || review.status === 'cancelled') return;

    const startTime = Date.now();
    try {
      await db.updateReviewStatus(reviewId, 'running');
      await SSEService.broadcastEvent(reviewId, null, 'running', 'Analysis started. Initializing agents.');

      const files = await db.getReviewFiles(reviewId);
      const apiFiles = files.map((f) => ({
        path: f.path,
        content: f.source_content || '',
      }));

      const categories = review.settings?.categories || ['bugs', 'security', 'performance', 'quality', 'tests'];

      // Broadcast agent initiation events
      for (const cat of categories) {
        await SSEService.broadcastEvent(reviewId, cat, 'running', `Agent '${cat}' analyzing source files...`);
      }

      // Call internal AI service
      const aiResult = await AIClientService.requestReviewAnalysis(
        reviewId,
        review.language,
        categories,
        apiFiles
      );

      // Persist individual agent runs
      for (const run of aiResult.agent_runs) {
        await db.saveAgentRun({
          review_id: reviewId,
          agent_name: run.agent_name,
          status: run.status,
          attempt: run.attempt || 1,
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: run.duration_ms,
          model: run.model || 'mock-agent-v1',
          output_summary: run.output_summary,
          error_code: run.error_code,
          error_message_safe: run.error_message_safe,
        });

        await SSEService.broadcastEvent(
          reviewId,
          run.agent_name,
          run.status,
          run.summary || `Agent completed with status: ${run.status}`
        );
      }

      // Persist findings
      const findingsToSave = aiResult.findings.map((f) => ({
        review_id: reviewId,
        agent_run_id: null,
        agent_name: f.agent,
        category: f.category,
        severity: f.severity,
        confidence: f.confidence,
        title: f.title,
        description: f.description,
        impact: f.impact,
        recommendation: f.recommendation,
        file_path: f.filePath,
        start_line: f.startLine,
        end_line: f.endLine,
        code_snippet: f.codeSnippet,
        evidence: f.evidence,
        cwe: f.cwe,
        suggested_patch: f.suggestedPatch,
        source_type: f.sourceType,
        fingerprint: f.fingerprint,
        status: f.status,
      }));

      await db.saveFindings(reviewId, findingsToSave);

      const durationMs = Date.now() - startTime;
      const finalStatus: ReviewStatus = (aiResult.status as ReviewStatus) || 'completed';

      await db.updateReviewStatus(
        reviewId,
        finalStatus,
        aiResult.summary,
        durationMs
      );

      await SSEService.broadcastEvent(
        reviewId,
        null,
        finalStatus,
        aiResult.summary || 'Review analysis completed successfully.',
        { severityCounts: aiResult.severity_counts }
      );
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(`Review job ${reviewId} failed:`, err);

      await db.updateReviewStatus(
        reviewId,
        'failed',
        'Review failed due to an unexpected analysis service error.',
        durationMs,
        'SERVICE_ERROR',
        err.message?.slice(0, 200) || 'Unknown error'
      );

      await SSEService.broadcastEvent(
        reviewId,
        null,
        'failed',
        'Review failed due to analysis service error.'
      );
    }
  }

  static async getReview(reviewId: string, userId: string): Promise<{
    review: Review;
    files: Array<{ path: string; line_count: number }>;
    severityCounts: SeverityCounts;
    agentRuns: any[];
  } | null> {
    const db = await getDatabase();
    const review = await db.getReviewById(reviewId, userId);
    if (!review) return null;

    const files = await db.getReviewFiles(reviewId);
    const findings = await db.getFindings(reviewId);
    const agentRuns = await db.getAgentRuns(reviewId);

    const counts: SeverityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const f of findings) {
      if (counts[f.severity] !== undefined) {
        counts[f.severity]++;
      }
    }

    return {
      review,
      files: files.map((f) => ({ path: f.path, line_count: f.line_count })),
      severityCounts: counts,
      agentRuns,
    };
  }

  static async getFindings(reviewId: string, userId: string, severity?: string, category?: string): Promise<Finding[] | null> {
    const db = await getDatabase();
    const review = await db.getReviewById(reviewId, userId);
    if (!review) return null;
    return await db.getFindings(reviewId, severity, category);
  }

  static async listReviews(userId: string, page = 1, pageSize = 20, status?: string) {
    const db = await getDatabase();
    return await db.getReviewsByUser(userId, page, pageSize, status);
  }

  static async cancelReview(reviewId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const review = await db.getReviewById(reviewId, userId);
    if (!review) return false;

    if (['completed', 'failed', 'cancelled'].includes(review.status)) {
      return false;
    }

    await db.updateReviewStatus(reviewId, 'cancelled', 'Review cancelled by user.');
    await SSEService.broadcastEvent(reviewId, null, 'cancelled', 'Review was cancelled by the user.');
    return true;
  }

  static async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    return await db.deleteReview(reviewId, userId);
  }
}
