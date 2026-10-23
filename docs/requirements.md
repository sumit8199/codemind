# CodeMind AI — Product Requirements Document

## 1. Purpose
CodeMind AI is a full-stack multi-agent code review platform. Users submit source code or connect an authorized GitHub pull request. Specialized analysis agents identify potential bugs, security risks, performance problems, maintainability issues, and missing tests. The system consolidates evidence-backed findings into a report.

## 2. Goals
- Deliver a functional end-to-end code review workflow.
- Demonstrate real multi-agent orchestration rather than simulated agent personas.
- Make findings traceable to actual files and line numbers.
- Clearly distinguish AI-generated hypotheses from tool-confirmed results.
- Provide persistent review history and useful developer-focused UX.
- Run locally through Docker Compose with documented setup.

## 3. Non-goals for MVP
- Automatically merge pull requests.
- Automatically modify repositories or push commits.
- Execute untrusted source code on the host.
- Guarantee detection of every vulnerability or bug.
- Build a general-purpose conversational assistant.

## 4. Target users
- Software developers reviewing code before committing.
- Students and job seekers demonstrating AI/backend engineering skills.
- Small teams wanting an assisted review workflow.

## 5. MVP user journeys
1. User registers and logs in.
2. User creates a project.
3. User pastes code or uploads supported source files.
4. User chooses review categories and starts a review.
5. UI displays queued/running/completed/failed state and agent progress.
6. User inspects findings by severity/category and clicks a finding to navigate to source lines.
7. User exports Markdown/JSON and later reopens the saved review.

## 6. Functional requirements
### Authentication and authorization
- Registration, login, current-user endpoint, logout/client token cleanup.
- Passwords stored only as secure hashes.
- Every project/review/finding query must enforce ownership or project membership.
- Use short-lived access tokens; if refresh tokens are implemented, store them securely and rotate them.

### Projects and reviews
- Create/list/view/delete projects.
- Create reviews from pasted code or supported files.
- Configure language and review categories.
- Persist review status, settings, timestamps, duration, model/provider metadata, and findings.
- Filter/paginate history.
- Cancel queued/running reviews when safe.
- Export a review report as Markdown and JSON.

### Multi-agent analysis
- Code understanding/context agent.
- Bug detection agent.
- Security analysis agent.
- Performance analysis agent.
- Code quality agent.
- Test coverage agent.
- Final reviewer/orchestrator for validation, deduplication, prioritization, and report generation.
- Independent agents should run concurrently when dependencies permit.
- Each agent has a bounded timeout, retry count, typed input/output, and explicit failure state.
- A failed agent must not silently produce fake findings. The final report must disclose partial analysis.

### Review progress
- Emit events containing review ID, agent name, status, message, and timestamp.
- Frontend receives updates through SSE or WebSockets.
- Reconnecting clients can retrieve current status.
- Never rely solely on an in-memory process for durable job state.

### Analysis tools
- Use deterministic static-analysis tools where available (e.g. Ruff/Bandit for Python, ESLint for JavaScript/TypeScript, Semgrep when installed/configured).
- Record tool name, version when available, exit status, and findings.
- Tool findings and LLM findings must be distinguishable.
- Tool absence must be reported as skipped/not configured, not as a clean scan.

### GitHub integration (post-MVP)
- Use a GitHub App or OAuth with least-privilege permissions.
- Review only repositories and pull requests authorized by the user.
- Analyze changed files/diffs where possible.
- Do not publish comments or create commits without explicit user confirmation.
- Manual code review must work without GitHub credentials.

## 7. Finding contract
Each finding includes:
- `id`, `agent`, `category`, `severity`, `confidence`
- `title`, `description`, `impact`, `recommendation`
- `filePath`, `startLine`, `endLine`
- `codeSnippet`, `evidence`
- optional `cwe`, `suggestedPatch`, `references`
- `sourceType` (`llm`, `static_tool`, or `manual_rule`)
- `status` (`open`, `dismissed`, `fixed`, or `accepted_risk`) where applicable

Allowed severity: `critical`, `high`, `medium`, `low`, `info`.
Confidence is a number from 0 to 1. File paths and line numbers must map to submitted source. Unknown values must be null; never invent evidence.

## 8. Quality attributes
- Security: protect secrets, isolate untrusted inputs, enforce authorization, redact logs.
- Reliability: bounded retries/timeouts, idempotent job creation where practical, clear failure states.
- Maintainability: typed contracts, modular services, migrations, tests, linting.
- Performance: parallelize independent agents and enforce request/source-size limits.
- Accessibility: keyboard navigation, readable contrast, semantic controls.
- Observability: structured logs, correlation/review IDs, durations, agent statuses, and error categories.
- Cost control: configurable model, token/cost metadata when provider exposes it, and per-review limits.

## 9. Acceptance criteria
- A developer can start the stack using documented commands.
- A user can submit a sample file and receive a persisted report.
- At least two real analysis paths run; full MVP adds all defined agents.
- Agent output is schema-validated.
- Findings show source evidence and valid line references or explicitly omit unknown locations.
- Agent errors/timeouts are visible and do not crash the entire service.
- Review history survives application restart.
- Authentication and ownership checks are covered by tests.
- Mock LLM mode is clearly labeled and only used when explicitly configured.
- Automated tests, lint, and type checks have documented results.

## 10. Constraints and assumptions
- AI provider credentials may be unavailable during initial development.
- GitHub integration is optional and must not block local/manual workflow.
- LLM output is probabilistic and can be wrong; the UI must communicate this.
- Supported languages/tools should be documented and expanded incrementally.
