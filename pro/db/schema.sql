CREATE TABLE IF NOT EXISTS revassist_deal_runs (
  id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('queued', 'streaming', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  dealer_id text NOT NULL,
  operator_id text NOT NULL,
  input_hash text NOT NULL,
  input_preview text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  latency_ms integer,
  output jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS revassist_deal_runs_dealer_created_idx
  ON revassist_deal_runs (dealer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS revassist_audit_events (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id text NOT NULL,
  dealer_id text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS revassist_audit_events_dealer_created_idx
  ON revassist_audit_events (dealer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS revassist_audit_events_run_idx
  ON revassist_audit_events (run_id);
