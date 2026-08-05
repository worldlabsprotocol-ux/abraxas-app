-- 054_partner_flow_audit_index.sql
-- P1-3: Index audit_events.metadata.flow_trace_id for production trace queries.
--
-- OPERATOR (copy-paste, review before apply):
--   BEGIN;
--   \i supabase/migrations/054_partner_flow_audit_index.sql
--   -- Verify:
--   SELECT indexname FROM pg_indexes
--     WHERE schemaname = 'public' AND indexname = 'idx_audit_events_flow_trace_id';
--   COMMIT;
--
-- Read-only trace audit (after events exist):
--   npm run audit:partner-flow-trace -- ft_vr_<verification_request_id>

CREATE INDEX IF NOT EXISTS idx_audit_events_flow_trace_id
  ON public.audit_events ((metadata->>'flow_trace_id'))
  WHERE metadata ? 'flow_trace_id';
