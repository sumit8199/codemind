# API Contract

Base URL for public API: `/api`.
All errors use a consistent envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request could not be validated",
    "requestId": "uuid",
    "details": []
  }
}
```

## Authentication
- `POST /api/auth/register` — create account.
- `POST /api/auth/login` — authenticate.
- `GET /api/auth/me` — return current user.

## Projects
- `POST /api/projects`
- `GET /api/projects?page=1&pageSize=20`
- `GET /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

## Reviews
- `POST /api/reviews` — create review and enqueue job.
- `GET /api/reviews?page=1&pageSize=20&status=completed&severity=high`
- `GET /api/reviews/:reviewId`
- `GET /api/reviews/:reviewId/findings?severity=high&category=security`
- `GET /api/reviews/:reviewId/events` — SSE stream.
- `POST /api/reviews/:reviewId/cancel`
- `DELETE /api/reviews/:reviewId`
- `GET /api/reviews/:reviewId/export?format=markdown`
- `GET /api/reviews/:reviewId/export?format=json`

## Create review request
```json
{
  "projectId": "uuid-or-null",
  "title": "Review authentication helper",
  "sourceType": "manual",
  "language": "typescript",
  "categories": ["bugs", "security", "performance", "quality", "tests"],
  "files": [
    {
      "path": "src/auth.ts",
      "content": "export function example() { return true; }"
    }
  ]
}
```

Validate path, language, file count, and total source size. Reject absolute paths, traversal segments, unsupported file types, and empty payloads. Never execute source content.

## Review response
```json
{
  "id": "uuid",
  "status": "queued",
  "summary": null,
  "severityCounts": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0
  },
  "createdAt": "ISO-8601",
  "completedAt": null
}
```

## Finding object
```json
{
  "id": "uuid",
  "agent": "security",
  "category": "security",
  "severity": "high",
  "confidence": 0.91,
  "title": "Potential unsafe query construction",
  "description": "Explain the issue and conditions.",
  "impact": "Explain realistic impact.",
  "recommendation": "Use parameterized queries.",
  "filePath": "src/db.ts",
  "startLine": 10,
  "endLine": 12,
  "codeSnippet": "source excerpt",
  "evidence": "Specific evidence from the submitted code",
  "cwe": "CWE-89",
  "suggestedPatch": null,
  "sourceType": "llm",
  "status": "open"
}
```

## Internal FastAPI service
- `GET /internal/health`
- `POST /internal/reviews`
- `GET /internal/reviews/{review_id}`
- `POST /internal/reviews/{review_id}/cancel`

Internal endpoints require service authentication, payload limits, and timeouts. Use Pydantic request/response models and FastAPI OpenAPI documentation.

## HTTP semantics
- `201` for created resources.
- `202` for accepted asynchronous reviews.
- `400` for malformed requests.
- `401` unauthenticated.
- `403` unauthorized resource access.
- `404` missing resource.
- `409` invalid state transition/conflict.
- `413` source payload too large.
- `422` schema validation failure.
- `429` rate limit.
- `500` unexpected internal error.
- `503` unavailable dependency.
