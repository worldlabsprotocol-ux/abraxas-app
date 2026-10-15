-- Build #579: read-only Production migration preflight (migrations 136 through 143).
-- Run against authorized Supabase PostgreSQL. No DDL. No row reads from holder tables.

select jsonb_build_object(
  'build', 579,
  'probe_version', 1,
  'captured_at', now(),
  'database', current_database(),
  'pg_version', current_setting('server_version'),
  'schema_migrations_tracked', (select count(*)::int from supabase_migrations.schema_migrations),
  'prerequisites', jsonb_build_object(
    'passport_holder_subjects', exists (select 1 from information_schema.tables where table_name = 'passport_holder_subjects'),
    'passport_holder_wallet_accounts', exists (select 1 from information_schema.tables where table_name = 'passport_holder_wallet_accounts'),
    'passport_holder_legacy_links', exists (select 1 from information_schema.tables where table_name = 'passport_holder_legacy_links'),
    'identity_verifications_holder_subject_id', exists (
      select 1 from information_schema.columns
      where table_name = 'identity_verifications' and column_name = 'holder_subject_id'
    ),
    'passport_idv_consent_records', exists (select 1 from information_schema.tables where table_name = 'passport_idv_consent_records'),
    'sovereign_credential_issuance_audit', exists (select 1 from information_schema.tables where table_name = 'sovereign_credential_issuance_audit')
  ),
  'migrations_140_143', jsonb_build_object(
    'passport_holder_possession_keys', exists (select 1 from information_schema.tables where table_name = 'passport_holder_possession_keys'),
    'passport_reusable_credentials', exists (select 1 from information_schema.tables where table_name = 'passport_reusable_credentials'),
    'linked_credential_jti', exists (
      select 1 from information_schema.columns
      where table_name = 'passport_reusable_credentials' and column_name = 'linked_credential_jti'
    ),
    'passport_institutional_presentation_consents', exists (
      select 1 from information_schema.tables where table_name = 'passport_institutional_presentation_consents'
    ),
    'passport_institutional_authorization_commits', exists (
      select 1 from information_schema.tables where table_name = 'passport_institutional_authorization_commits'
    ),
    'signing_claim_token', exists (
      select 1 from information_schema.columns
      where table_name = 'passport_institutional_authorization_commits' and column_name = 'signing_claim_token'
    ),
    'consume_passport_possession_challenge', exists (
      select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'consume_passport_possession_challenge'
    )
  ),
  'grants_service_role_140', jsonb_build_object(
    'passport_reusable_credentials', (
      select count(*) > 0 from information_schema.role_table_grants
      where table_name = 'passport_reusable_credentials' and grantee = 'service_role'
    ),
    'passport_holder_possession_keys', (
      select count(*) > 0 from information_schema.role_table_grants
      where table_name = 'passport_holder_possession_keys' and grantee = 'service_role'
    )
  ),
  'legacy_identity_columns', jsonb_build_object(
    'identity_verifications_sui_address', exists (
      select 1 from information_schema.columns where table_name = 'identity_verifications' and column_name = 'sui_address'
    ),
    'passport_documents_sui_address', exists (
      select 1 from information_schema.columns where table_name = 'passport_documents' and column_name = 'sui_address'
    )
  ),
  'passport_table_inventory', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from (select table_name from information_schema.tables where table_schema = 'public' and table_name like 'passport%' order by table_name) t
  )
) as production_migration_preflight_report;
