# Data Model

Use PostgreSQL with UUID primary keys, UTC timestamps, foreign keys, migrations, and indexes. Pick one service as the owner of schema migrations. Recommended: Node.js owns core application tables; FastAPI returns typed results and does not independently mutate the same tables.

## users
- `id UUID PK`
- `email CITEXT UNIQUE NOT NULL`
- `password_hash TEXT NOT NULL`
- `display_name TEXT`
- `created_at`, `updated_at TIMESTAMPTZ NOT NULL`

## projects
- `id UUID PK`
- `owner_user_id UUID FK users`
- `name TEXT NOT NULL`
- `description TEXT`
- `created_at`, `updated_at TIMESTAMPTZ NOT NULL`
- Index on `(owner_user_id, updated_at DESC)`

## reviews
- `id UUID PK`
- `owner_user_id UUID FK users`
- `project_id UUID FK projects NULL`
- `title TEXT`
- `source_type TEXT` (`manual`, `github_pr`)
- `language TEXT`
- `status TEXT` (`queued`, `running`, `completed`, `partially_completed`, `failed`, `cancelling`, `cancelled`)
- `summary TEXT`
- `settings JSONB`
- `provider TEXT`, `model TEXT`
- `duration_ms BIGINT NULL`
- `token_usage JSONB NULL`
- `error_code TEXT NULL`, `error_message_safe TEXT NULL`
- `created_at`, `started_at`, `completed_at`, `updated_at TIMESTAMPTZ`
- Indexes on `(owner_user_id, created_at DESC)` and `(status, created_at)`

## review_files
- `id UUID PK`
- `review_id UUID FK reviews ON DELETE CASCADE`
- `path TEXT NOT NULL`
- `language TEXT`
- `content_hash TEXT NOT NULL`
- `source_content TEXT` only if retention is explicitly configured; otherwise store sanitized/redacted content or omit after processing.
- `line_count INTEGER`
- Unique `(review_id, path)`

## agent_runs
- `id UUID PK`
- `review_id UUID FK reviews ON DELETE CASCADE`
- `agent_name TEXT NOT NULL`
- `status TEXT NOT NULL`
- `attempt INTEGER NOT NULL DEFAULT 1`
- `started_at`, `completed_at TIMESTAMPTZ`
- `duration_ms BIGINT`
- `model TEXT`, `token_usage JSONB`
- `error_code TEXT NULL`, `error_message_safe TEXT NULL`
- `output_summary JSONB NULL`
- Index `(review_id, agent_name)`

## findings
- `id UUID PK`
- `review_id UUID FK reviews ON DELETE CASCADE`
- `agent_run_id UUID FK agent_runs NULL`
- `agent_name TEXT`
- `category TEXT`
- `severity TEXT`
- `confidence NUMERIC(4,3)`
- `title TEXT NOT NULL`
- `description TEXT`, `impact TEXT`, `recommendation TEXT`
- `file_path TEXT NULL`
- `start_line INTEGER NULL`, `end_line INTEGER NULL`
- `code_snippet TEXT NULL`, `evidence TEXT NOT NULL`
- `cwe TEXT NULL`, `suggested_patch TEXT NULL`
- `source_type TEXT`
- `fingerprint TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'open'`
- `created_at TIMESTAMPTZ NOT NULL`
- Indexes on `(review_id, severity)`, `(review_id, category)`, and unique `(review_id, fingerprint)`

## review_events
- `id BIGSERIAL PK`
- `review_id UUID FK reviews ON DELETE CASCADE`
- `event_type TEXT`
- `agent_name TEXT NULL`
- `status TEXT`
- `message_safe TEXT`
- `payload JSONB`
- `created_at TIMESTAMPTZ NOT NULL`
- Index `(review_id, id)`

## github_integrations (optional phase)
- `id UUID PK`
- `user_id UUID FK users`
- `provider TEXT`
- `external_account_id TEXT`
- `encrypted_credentials BYTEA` or external secret reference
- `scopes JSONB`
- `created_at`, `updated_at`, `revoked_at`

## General rules
- Enforce ownership in queries and service methods, not only in the UI.
- Do not store plaintext provider/GitHub secrets.
- Avoid retaining raw source longer than necessary; make retention explicit.
- Use transactions when completing reviews and replacing findings.
- Do not store derived counts as the only source of truth; calculate or safely maintain them.
