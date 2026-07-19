-- FILE: supabase/migrations/041_security_reports.sql
-- Bug bounty pre-registration submissions — persisted for SLA tracking.

CREATE TABLE IF NOT EXISTS security_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
  description     TEXT NOT NULL,
  reproduction    TEXT,
  contact_email   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'submitted',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_reports_created ON security_reports (created_at DESC);

ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_reports_service_write"
  ON security_reports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
