-- 036_identity_capture_metadata.sql
-- Abraxas-native capture: legal name, document type, grouped session id.

alter table public.passport_documents
  add column if not exists document_type text,
  add column if not exists capture_session_id text,
  add column if not exists legal_name text;

create index if not exists idx_passport_documents_capture_session
  on public.passport_documents (capture_session_id)
  where capture_session_id is not null;
