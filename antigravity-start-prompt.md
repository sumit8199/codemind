# Antigravity Start Prompt

Read and follow these project documents before coding:
- `requirements.md`
- `architecture.md`
- `implementation-plan.md`
- `api-contract.md`
- `data-model.md`
- `agent-specifications.md`
- `security.md`
- `testing-strategy.md`

You are working in the CodeMind AI repository. Inspect the workspace first and preserve existing useful code. Treat these documents as the source of truth. If documents conflict, prioritize security requirements, then product requirements, then architecture decisions; document any necessary resolution.

Do not attempt a giant one-shot code dump. Start with Phase 0 and Phase 1 in `implementation-plan.md`. Create a checklist, scaffold the monorepo, implement the smallest complete vertical slice, run tests and fix errors, then proceed phase by phase.

Important constraints:
- Node.js/Express/TypeScript owns public APIs, authentication, review lifecycle, queue, and persistence for core application tables.
- FastAPI/Python owns LangGraph and analysis logic. Do not duplicate ownership of the same tables.
- Never execute user-submitted source code on the host.
- Mock provider is only for explicit local/test use and must be labeled as mock.
- Do not invent findings, source lines, successful tests, or GitHub data.
- Manual code submission must work without GitHub credentials.
- Keep all secrets out of source control.
- After each phase, report files changed, commands run, actual test results, and blockers.

Begin by inspecting the workspace, then create/update the implementation checklist and architecture docs. Proceed with Phase 1 until the end-to-end vertical slice works.
