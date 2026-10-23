import axios from 'axios';
import { Review, Finding, Project, ReviewEvent } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ApiService = {
  // Reviews
  async createReview(data: {
    projectId?: string | null;
    title: string;
    language: string;
    categories: string[];
    files: Array<{ path: string; content: string }>;
  }): Promise<{ id: string; status: string }> {
    const res = await api.post('/reviews', data);
    return res.data;
  },

  async getReviews(page = 1, pageSize = 20, status?: string): Promise<{ reviews: Review[]; total: number }> {
    const params: any = { page, pageSize };
    if (status) params.status = status;
    const res = await api.get('/reviews', { params });
    return {
      reviews: res.data.reviews,
      total: res.data.pagination.total,
    };
  },

  async getReview(id: string): Promise<Review> {
    const res = await api.get(`/reviews/${id}`);
    return res.data;
  },

  async getFindings(id: string, severity?: string, category?: string): Promise<Finding[]> {
    const params: any = {};
    if (severity) params.severity = severity;
    if (category) params.category = category;
    const res = await api.get(`/reviews/${id}/findings`, { params });
    return res.data.findings;
  },

  async cancelReview(id: string): Promise<void> {
    await api.post(`/reviews/${id}/cancel`);
  },

  async deleteReview(id: string): Promise<void> {
    await api.delete(`/reviews/${id}`);
  },

  getExportUrl(id: string, format: 'markdown' | 'json'): string {
    return `/api/reviews/${id}/export?format=${format}`;
  },

  // SSE Stream
  subscribeToReviewEvents(reviewId: string, onEvent: (evt: ReviewEvent) => void): () => void {
    const eventSource = new EventSource(`/api/reviews/${reviewId}/events`);

    eventSource.onmessage = (event) => {
      try {
        const parsed: ReviewEvent = JSON.parse(event.data);
        onEvent(parsed);
      } catch (err) {
        // ignore parse error on keepalive comments
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE stream reconnecting or closed', err);
    };

    return () => {
      eventSource.close();
    };
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await api.get('/projects');
    return res.data.projects;
  },

  async createProject(name: string, description?: string): Promise<Project> {
    const res = await api.post('/projects', { name, description });
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
