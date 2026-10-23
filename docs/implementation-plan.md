# Implementation Plan

## Phase 0 — Workspace inspection and decisions
- Inspect existing files and preserve useful work.
- Confirm package manager and supported runtime versions.
- Create `docs/architecture.md`, this plan, API contract, data model, and threat model.
- Add root README, `.gitignore`, `.env.example`, and Docker Compose skeleton.
- Do not scaffold competing frameworks or duplicate persistence ownership.

## Phase 1 — Vertical slice
- Scaffold React/Vite, Node/Express/TypeScript, FastAPI/Pydantic.
- Add PostgreSQL and migrations.
- Implement health endpoints and service-to-service authentication.
- Build manual code submission page and API.
- Add one real provider-backed agent plus an explicitly configured mock provider for tests.
- Persist review and findings; show a report in the UI.
- Add one end-to-end test.

**Exit gate:** paste code -> review runs -> report persists -> report reopens after restart.

## Phase 2 — Agent graph
- Implement typed LangGraph state.
- Add code context, bug, security, performance, quality, and test agents.
- Run independent agents concurrently.
- Add static analyzers for supported languages.
- Validate, normalize, and deduplicate findings.
- Add timeouts, bounded retries, partial failure behavior, and cancellation.

**Exit gate:** integration test proves multiple independent agents run and outputs are merged.

## Phase 3 — Job queue and progress
- Add Redis/BullMQ worker.
- Persist job/review states and important progress events.
- Implement SSE with reconnect/current-status recovery.
- Add failure/retry visibility and cancellation.

**Exit gate:** UI reflects queued/running/completed/failed states and recovers after page refresh.

## Phase 4 — User accounts and project history
- Implement registration/login, secure password hashing, authorization.
- Add projects, review history, pagination, filters, and deletion.
- Add Markdown/JSON exports.
- Add tests for cross-user access prevention.

## Phase 5 — UX and analytics
- Dashboard metrics based on real database queries.
- Monaco source navigation and finding details.
- Loading, empty, error, partial-analysis, and retry states.
- Accessibility and responsive layouts.

## Phase 6 — GitHub integration (optional)
- Add GitHub App/OAuth with least privilege.
- Fetch authorized PR metadata and changed files.
- Analyze diffs and map findings to changed lines.
- Publish comments only after explicit confirmation.
- Test pagination, revoked tokens, permission failures, and rate limits.

## Phase 7 — Hardening and release
- Add Docker health checks and non-root containers.
- Add resource limits and network isolation for static-analysis tools.
- Add CI for lint, type-check, tests, and migrations.
- Run dependency and secret scans.
- Document setup, configuration, limitations, and troubleshooting.

## Required progress reporting
At each phase, report files changed, commands run, test outcomes, and remaining blockers. Do not claim tests passed unless executed. Fix failures before proceeding when possible.
