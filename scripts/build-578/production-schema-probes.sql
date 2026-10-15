-- Build #578: read-only Production Passport schema verification (founder / operator execution).
-- Target: authorized Production Supabase PostgreSQL (project ref bztwutzprwsdrtqdpymf).
-- Use a read-only role. Do not apply migrations from this file. No SELECT from holder or credential rows.
-- Save stdout as JSON for review (single row: production_passport_schema_report).

select jsonb_build_object(
  'build', 578,
  'probe_version', 1,
  'captured_at', now(),
  'database', current_database(),
  'pg_version', current_setting('server_version'),
  'public_table_count', (
    select count(*)::int from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  ),
  'schema_migrations_tracked', (
    select count(*)::int from supabase_migrations.schema_migrations
  ),
  'objects', jsonb_build_object(
    'passport_holder_subjects', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_holder_subjects'
    ),
    'passport_holder_wallet_accounts', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_holder_wallet_accounts'
    ),
    'identity_verifications_holder_subject_id', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'identity_verifications'
        and column_name = 'holder_subject_id'
    ),
    'passport_documents_holder_subject_id', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'passport_documents'
        and column_name = 'holder_subject_id'
    ),
    'identity_review_sessions_holder_subject_id', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'identity_review_sessions'
        and column_name = 'holder_subject_id'
    ),
    'passport_idv_consent_records', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_idv_consent_records'
    ),
    'abraxas_evidence_custody', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'abraxas_evidence_custody'
    ),
    'sovereign_credential_issuance_audit', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'sovereign_credential_issuance_audit'
    ),
    'passport_holder_possession_keys', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_holder_possession_keys'
    ),
    'passport_reusable_credentials', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_reusable_credentials'
    ),
    'passport_reusable_credentials_signed_credential_text', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'passport_reusable_credentials'
        and column_name = 'signed_credential_text'
    ),
    'passport_possession_challenges', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_possession_challenges'
    ),
    'consume_passport_possession_challenge', exists (
      select 1 from pg_proc p
      join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'consume_passport_possession_challenge'
    ),
    'passport_institutional_presentation_consents', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_institutional_presentation_consents'
    ),
    'passport_institutional_authorization_commits', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'passport_institutional_authorization_commits'
    ),
    'signing_claim_token', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'passport_institutional_authorization_commits'
        and column_name = 'signing_claim_token'
    ),
    'signing_claim_expires_at', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'passport_institutional_authorization_commits'
        and column_name = 'signing_claim_expires_at'
    ),
    'decision_receipts', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'decision_receipts'
    )
  ),
  'passport_table_names', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from (
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name like 'passport%'
      order by table_name
    ) t
  ),
  'indexes_reusable_lifecycle', (
    select coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'index', indexname) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes
    where schemaname = 'public'
      and tablename in (
        'passport_reusable_credentials',
        'passport_institutional_presentation_consents',
        'passport_institutional_authorization_commits'
      )
  )
) as production_passport_schema_report;
