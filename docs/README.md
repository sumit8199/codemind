# CodeMind AI — Antigravity Project Brief

This folder contains project-context documents intended to be placed at the root of the CodeMind AI repository before asking Antigravity to implement it.

## Files
- `requirements.md` — product scope, functional/non-functional requirements, acceptance criteria.
- `architecture.md` — service boundaries and workflow design.
- `implementation-plan.md` — phased build plan and exit gates.
- `api-contract.md` — public/internal endpoints and payload conventions.
- `data-model.md` — proposed relational schema.
- `agent-specifications.md` — agent roles, evidence requirements, severity and deduplication rules.
- `security.md` — threat model and baseline controls.
- `testing-strategy.md` — required test cases and test modes.
- `environment.example` — sample environment variables; rename/copy as needed.
- `antigravity-start-prompt.md` — prompt to start the coding agent.

## Use
1. Extract this bundle into a folder.
2. Copy the Markdown files into the root of your Antigravity workspace (or into `docs/` and update the start prompt paths).
3. Copy `environment.example` to appropriate `.env.example` files or use it as a reference. Do not use the example secrets in production.
4. Open the project folder in Antigravity.
5. Paste the content of `antigravity-start-prompt.md` into the agent.
6. Ask it to complete one phase at a time and verify tests before moving forward.

These are initial specifications, not proof that the application has been implemented. Antigravity should adapt details after inspecting the actual workspace.
