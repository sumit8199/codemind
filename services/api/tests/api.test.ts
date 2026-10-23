import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getDatabase } from '../src/db/index.js';
import { AuthService } from '../src/services/auth.service.js';

describe('CodeMind API Test Suite', () => {
  let userToken: string;
  let otherUserToken: string;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    // Force memory DB adapter for completely isolated and fast test execution
    process.env.FORCE_MEMORY_DB = 'true';
    await getDatabase();

    // Register User A
    const resA = await AuthService.register('alice@codemind.ai', 'password123', 'Alice Dev');
    userId = resA.user.id;
    userToken = resA.token;

    // Register User B
    const resB = await AuthService.register('bob@codemind.ai', 'password123', 'Bob QA');
    otherUserId = resB.user.id;
    otherUserToken = resB.token;
  });

  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('codemind-api');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@codemind.ai', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alice@codemind.ai');
      // Passwords must never be exposed
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@codemind.ai', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should get current authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('alice@codemind.ai');
    });
  });

  describe('Input Validation & Security Controls', () => {
    it('should reject path traversal in submitted files', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Malicious Review',
          language: 'typescript',
          categories: ['security'],
          files: [{ path: '../../etc/passwd', content: 'root:x:0:0' }],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject absolute paths in submitted files', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Absolute Path Review',
          language: 'typescript',
          categories: ['security'],
          files: [{ path: '/var/www/index.ts', content: 'console.log(1)' }],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty source files payload', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Empty Review',
          language: 'typescript',
          categories: ['bugs'],
          files: [],
        });

      expect(res.status).toBe(422);
    });
  });

  describe('Projects & Cross-User Isolation', () => {
    let projectAId: string;

    it('should create project for User A', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Alpha Core', description: 'Core services' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Alpha Core');
      projectAId = res.body.id;
    });

    it('should prevent User B from viewing User A project', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('Review Lifecycle & Vertical Slice Flow', () => {
    let reviewId: string;

    it('should create and enqueue a review', async () => {
      const sampleCode = `
        import fs from 'fs';
        export function processPayment(user: any) {
          const key = "sk_live_secret123456";
          const query = "SELECT * FROM accounts WHERE id = " + user.id;
          return query;
        }
      `;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Payment Processor Review',
          language: 'typescript',
          categories: ['bugs', 'security'],
          files: [{ path: 'src/payment.ts', content: sampleCode }],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('queued');
      reviewId = res.body.id;
    });

    it('should retrieve review details by id', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(reviewId);
      expect(res.body.title).toBe('Payment Processor Review');
      expect(res.body.files).toHaveLength(1);
    });

    it('should prevent cross-user access to reviews', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(404);
    });

    it('should export review report as markdown', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}/export?format=markdown`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/markdown');
      expect(res.text).toContain('# CodeMind AI');
      expect(res.text).toContain('Payment Processor Review');
    });

    it('should export review report as json', async () => {
      const res = await request(app)
        .get(`/api/reviews/${reviewId}/export?format=json`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.review.id).toBe(reviewId);
    });
  });
});
