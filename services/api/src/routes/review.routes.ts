import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ReviewService } from '../services/review.service.js';
import { SSEService } from '../services/sse.service.js';
import { ExportService } from '../services/export.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { CreateReviewSchema } from '../schemas/review.schema.js';

const router = Router();

// Review creation and listings require auth
router.use(requireAuth);

router.post('/reviews', validateBody(CreateReviewSchema), async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const review = await ReviewService.createReview(userId, req.body);
  res.status(201).json({
    id: review.id,
    status: review.status,
    summary: review.summary,
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    createdAt: review.created_at,
    completedAt: review.completed_at,
  });
});

router.get('/reviews', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string || '1', 10);
  const pageSize = parseInt(req.query.pageSize as string || '20', 10);
  const status = req.query.status as string | undefined;

  const result = await ReviewService.listReviews(userId, page, pageSize, status);
  res.json({
    reviews: result.reviews,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
});

router.get('/reviews/:reviewId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = await ReviewService.getReview(req.params.reviewId, userId);

  if (!data) {
    res.status(404).json({
      error: {
        code: 'REVIEW_NOT_FOUND',
        message: 'Review does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  res.json({
    id: data.review.id,
    title: data.review.title,
    language: data.review.language,
    status: data.review.status,
    summary: data.review.summary,
    severityCounts: data.severityCounts,
    provider: data.review.provider,
    model: data.review.model,
    durationMs: data.review.duration_ms,
    files: data.files,
    agentRuns: data.agentRuns,
    createdAt: data.review.created_at,
    startedAt: data.review.started_at,
    completedAt: data.review.completed_at,
  });
});

router.get('/reviews/:reviewId/findings', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const severity = req.query.severity as string | undefined;
  const category = req.query.category as string | undefined;

  const findings = await ReviewService.getFindings(req.params.reviewId, userId, severity, category);
  if (findings === null) {
    res.status(404).json({
      error: {
        code: 'REVIEW_NOT_FOUND',
        message: 'Review does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  // Format response per Finding object specification in api-contract.md
  const formatted = findings.map((f) => ({
    id: f.id,
    agent: f.agent_name,
    category: f.category,
    severity: f.severity,
    confidence: f.confidence,
    title: f.title,
    description: f.description,
    impact: f.impact,
    recommendation: f.recommendation,
    filePath: f.file_path,
    startLine: f.start_line,
    endLine: f.end_line,
    codeSnippet: f.code_snippet,
    evidence: f.evidence,
    cwe: f.cwe,
    suggestedPatch: f.suggested_patch,
    sourceType: f.source_type,
    status: f.status,
    fingerprint: f.fingerprint,
  }));

  res.json({ findings: formatted });
});

router.get('/reviews/:reviewId/events', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const reviewData = await ReviewService.getReview(req.params.reviewId, userId);
  if (!reviewData) {
    res.status(404).json({
      error: {
        code: 'REVIEW_NOT_FOUND',
        message: 'Review does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  const clientId = uuidv4();
  await SSEService.registerClient(req.params.reviewId, clientId, res);
});

router.post('/reviews/:reviewId/cancel', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const success = await ReviewService.cancelReview(req.params.reviewId, userId);

  if (!success) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: 'Review could not be cancelled or is already in terminal state',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  res.json({ success: true, message: 'Review cancelled' });
});

router.delete('/reviews/:reviewId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deleted = await ReviewService.deleteReview(req.params.reviewId, userId);

  if (!deleted) {
    res.status(404).json({
      error: {
        code: 'REVIEW_NOT_FOUND',
        message: 'Review does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  res.json({ success: true, message: 'Review deleted successfully' });
});

router.get('/reviews/:reviewId/export', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const reviewData = await ReviewService.getReview(req.params.reviewId, userId);

  if (!reviewData) {
    res.status(404).json({
      error: {
        code: 'REVIEW_NOT_FOUND',
        message: 'Review does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  const findings = await ReviewService.getFindings(req.params.reviewId, userId);
  const format = (req.query.format as string || 'markdown').toLowerCase();

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="review-${req.params.reviewId}.json"`);
    res.json(ExportService.formatJSON(reviewData.review, findings || [], reviewData.severityCounts));
    return;
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="review-${req.params.reviewId}.md"`);
  res.send(ExportService.formatMarkdown(reviewData.review, findings || [], reviewData.severityCounts));
});

export default router;
