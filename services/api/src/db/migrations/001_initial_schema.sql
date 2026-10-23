-- CodeMind AI Initial PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON projects(owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'manual',
    language TEXT NOT NULL DEFAULT 'typescript',
    status TEXT NOT NULL DEFAULT 'queued',
    summary TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider TEXT NOT NULL DEFAULT 'mock',
    model TEXT NOT NULL DEFAULT 'mock-agent-v1',
    duration_ms BIGINT,
    token_usage JSONB,
    error_code TEXT,
    error_message_safe TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_owner_created ON reviews(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews(status, created_at);

CREATE TABLE IF NOT EXISTS review_files (
    id UUID PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    language TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    source_content TEXT,
    line_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_review_file_path UNIQUE (review_id, path)
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    model TEXT,
    token_usage JSONB,
    error_code TEXT,
    error_message_safe TEXT,
    output_summary JSONB
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_review ON agent_runs(review_id, agent_name);

CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    agent_name TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence NUMERIC(4,3) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT,
    recommendation TEXT,
    file_path TEXT,
    start_line INTEGER,
    end_line INTEGER,
    code_snippet TEXT,
    evidence TEXT NOT NULL,
    cwe TEXT,
    suggested_patch TEXT,
    source_type TEXT NOT NULL DEFAULT 'llm',
    fingerprint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_fingerprint UNIQUE (review_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_findings_review_sev ON findings(review_id, severity);
CREATE INDEX IF NOT EXISTS idx_findings_review_cat ON findings(review_id, category);

CREATE TABLE IF NOT EXISTS review_events (
    id BIGSERIAL PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    agent_name TEXT,
    status TEXT NOT NULL,
    message_safe TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_events_order ON review_events(review_id, id);
