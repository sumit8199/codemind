# Security and Threat Model

## Assets
- User accounts and sessions.
- Submitted source code and repository metadata.
- AI provider and GitHub credentials.
- Review reports and findings.
- Internal service endpoints and job queue.

## Trust boundaries
- Browser to Node.js public API.
- Node.js worker to private FastAPI service.
- Application services to PostgreSQL and Redis.
- Static-analysis sandbox to submitted source.
- AI provider prompt/response boundary.
- GitHub integration boundary.

## Threats and controls
### Malicious source and prompt injection
Source comments or README text may attempt to override agent instructions. Treat repository content only as data, delimit it clearly, restrict tool permissions, validate outputs, and never allow source content to change system policy.

### Arbitrary code execution
Do not execute submitted source. Static analyzers must run in isolated containers with no network by default, read-only input mounts, non-root user, CPU/memory/time limits, and minimal filesystem access.

### Path traversal and archive attacks
Reject absolute paths, `..` traversal, symlinks where unsafe, excessive file counts, oversized files, and archive bombs. Normalize paths before storage.

### Broken access control
Check ownership and project membership on every read, update, delete, export, and cancellation endpoint. Test cross-user access explicitly.

### Credential leakage
Keep secrets in environment/secret manager. Redact likely secrets from code sent to external providers when possible. Never expose provider keys to frontend or logs. Encrypt stored GitHub credentials or use a secret manager.

### SSRF and unsafe integrations
Do not fetch arbitrary user-supplied URLs by default. If URL fetching is added, block private/internal IP ranges, validate redirects, and use strict allowlists.

### Resource exhaustion and cost abuse
Set request, source size, file count, concurrency, token, timeout, and per-user rate limits. Bound retries and queue growth. Add cost visibility when provider data is available.

### Unsafe generated patches
Never apply patches automatically. Show diffs and require user confirmation before any external write action.

### Data retention
Avoid storing source unnecessarily. Document retention and deletion behavior. Avoid full source logging. Restrict report exports to authorized users.

## Baseline controls
- TLS in deployed environments.
- Secure password hashing.
- Strong CORS allowlist.
- Rate limiting and request size limits.
- Parameterized database queries.
- Secure headers.
- Service-to-service authentication.
- Dependency scanning and secret scanning in CI.
- Safe error messages without stack traces.
- Audit events for sensitive integration actions.

## Residual risks
AI analysis can miss real issues or produce false positives. Static analyzers also have limits. Reports must be presented as assistance, not a guarantee of security.
