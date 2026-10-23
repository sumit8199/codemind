import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/app.js';
import { getDatabase } from '../src/db/index.js';
import { AuthService } from '../src/services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('End-to-End Multi-Agent Integration Test', () => {
  let aiServiceProcess: ChildProcess;
  let token: string;

  beforeAll(async () => {
    process.env.FORCE_MEMORY_DB = 'true';
    await getDatabase();

    const auth = await AuthService.register('e2e-tester@codemind.ai', 'password123', 'E2E Tester');
    token = auth.token;

    // Start Python AI Service
    const aiServiceDir = path.resolve(__dirname, '../../ai-service');
    const pythonExe = path.join(aiServiceDir, '.venv', 'Scripts', 'python.exe');

    aiServiceProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
      cwd: aiServiceDir,
      stdio: 'pipe',
    });

    // Wait for AI service to respond on /internal/health
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://localhost:8000/internal/health');
        if (res.ok) {
          healthy = true;
          break;
        }
      } catch (e) {
        // wait
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!healthy) {
      console.warn('AI service did not become healthy in time during test setup');
    }
  }, 25000);

  afterAll(() => {
    if (aiServiceProcess) {
      aiServiceProcess.kill();
    }
  });

  it('submits code, executes multi-agent swarm, merges findings, and persists report', async () => {
    const testCode = `
      import fs from 'fs';
      export function authenticateUser(req: any) {
        const apiKey = "sk_live_1234567890abcdef";
        const query = "SELECT * FROM users WHERE id = " + req.query.id;
        const secretConfig = fs.readFileSync("/etc/secrets.json", "utf8");
        console.log("Logged token: " + req.headers.authorization);
        if (req.role == 0) {
          req.data.isAdmin = true;
        }
        return query;
      }
    `;

    // 1. Submit review
    const submitRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'E2E Authentication Handler Audit',
        language: 'typescript',
        categories: ['bugs', 'security', 'performance', 'quality', 'tests'],
        files: [{ path: 'src/auth/handler.ts', content: testCode }],
      });

    expect(submitRes.status).toBe(201);
    const reviewId = submitRes.body.id;
    expect(reviewId).toBeDefined();

    // 2. Poll until review status is completed (allow up to 10s for multi-agent async execution)
    let review: any = null;
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${token}`);

      if (['completed', 'partially_completed', 'failed'].includes(getRes.body.status)) {
        review = getRes.body;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(review).toBeDefined();
    expect(review.status).toBe('completed');
    expect(review.summary).toContain('CodeMind AI multi-agent analysis');
    expect(review.severityCounts.critical + review.severityCounts.high).toBeGreaterThan(0);
    expect(review.agentRuns.length).toBeGreaterThanOrEqual(4);

    // 3. Inspect findings contract
    const findingsRes = await request(app)
      .get(`/api/reviews/${reviewId}/findings`)
      .set('Authorization', `Bearer ${token}`);

    expect(findingsRes.status).toBe(200);
    const findings = findingsRes.body.findings;
    expect(findings.length).toBeGreaterThan(0);

    // Verify evidence & line references
    for (const f of findings) {
      expect(f.filePath).toBe('src/auth/handler.ts');
      expect(f.evidence).toBeDefined();
      expect(f.fingerprint).toBeDefined();
      expect(['critical', 'high', 'medium', 'low', 'info']).toContain(f.severity);
    }

    // 4. Verify Markdown Export
    const exportRes = await request(app)
      .get(`/api/reviews/${reviewId}/export?format=markdown`)
      .set('Authorization', `Bearer ${token}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.text).toContain('# CodeMind AI — Security & Code Quality Audit Report');
    expect(exportRes.text).toContain('E2E Authentication Handler Audit');
  }, 30000);
});
