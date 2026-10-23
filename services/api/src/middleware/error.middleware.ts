import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Do not expose stack traces to client per security.md
  res.status(status).json({
    error: {
      code,
      message,
      requestId: req.requestId || '',
      details: err.details || [],
    },
  });
}
