import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import projectRouter from './routes/project.routes.js';
import reviewRouter from './routes/review.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

export const app = express();

// Security and CORS
app.use(
  cors({
    origin: [config.FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));

// Correlation ID middleware
app.use((req: Request, res: Response, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// API Routes
app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', projectRouter);
app.use('/api', reviewRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} does not exist`,
      requestId: req.requestId || '',
      details: [],
    },
  });
});

// Global Error Handler
app.use(errorHandler);
