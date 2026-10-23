# Testing Strategy

## Test pyramid
1. Unit tests for schemas, utilities, state transitions, finding normalization, fingerprints, and severity counts.
2. Service tests for authentication, authorization, persistence, queue integration, and agent orchestration.
3. API integration tests for Node.js and FastAPI contracts.
4. End-to-end test for submit -> progress -> persisted report -> reopen.
5. Optional provider integration tests requiring configured credentials.

## Required cases
### Authentication/authorization
- Invalid credentials rejected.
- Password hashes never returned.
- User A cannot view, export, cancel, or delete User B's resources.
- Expired/invalid tokens rejected.

### Input validation
- Empty source rejected.
- Oversized files and file counts rejected.
- Absolute and traversal paths rejected.
- Unsupported language is handled explicitly.
- Malformed JSON rejected.

### Agents and orchestration
- Every agent output validates against schema.
- Invalid model response triggers bounded retry.
- One agent timeout does not hang the entire workflow.
- Parallel agents run concurrently where appropriate.
- Duplicate findings are consolidated.
- Missing line locations remain null rather than fabricated.
- Partial analysis is labeled.
- Cancellation and retries have valid state transitions.

### Static analyzers
- Tool missing -> status is skipped/not configured.
- Nonzero exit -> safe error recorded.
- Tool output parsing is tested with fixture output.
- Analyzer execution is isolated and resource-limited.

### UI
- Loading, empty, error, partial, and completed states.
- Finding filter and editor navigation.
- SSE reconnect and refresh recovery.
- Export actions work.

## Test modes
- Unit/integration tests use deterministic fake LLM responses.
- Mock provider must be explicitly configured and visibly labeled.
- Optional live-provider tests are opt-in and never required for the default CI run.
- Use sample fixtures with known issues and expected findings; avoid requiring exact wording from an LLM.
