import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { ReviewFile, Finding, AgentRun, SeverityCounts } from '../types/index.js';

export interface AIReviewResponse {
  review_id: string;
  status: string;
  summary: string;
  severity_counts: SeverityCounts;
  agent_runs: Array<{
    agent_name: string;
    status: string;
    attempt: number;
    duration_ms: number;
    model?: string;
    summary?: string;
    output_summary?: Record<string, any>;
    error_code?: string;
    error_message_safe?: string;
    findings: Finding[];
  }>;
  findings: Finding[];
  provider: string;
  model: string;
}

export class AIClientService {
  static async requestReviewAnalysis(
    reviewId: string,
    language: string,
    categories: string[],
    files: Array<{ path: string; content: string }>
  ): Promise<AIReviewResponse> {
    const correlationId = uuidv4();
    const endpoint = `${config.AI_SERVICE_URL}/internal/reviews`;

    const payload = {
      review_id: reviewId,
      language,
      categories,
      files,
    };

    const response = await axios.post<AIReviewResponse>(endpoint, payload, {
      headers: {
        'X-Internal-Token': config.INTERNAL_SERVICE_TOKEN,
        'X-Correlation-ID': correlationId,
        'Content-Type': 'application/json',
      },
      timeout: config.REVIEW_TIMEOUT_SECONDS * 1000,
    });

    return response.data;
  }
}
