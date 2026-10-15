-- Build #580: read-only Production migration release gates (no DDL, no holder row reads).
-- Target: authorized Supabase PostgreSQL project ref bztwutzprwsdrtqdpymf.
-- Attach backup attestation fields manually in stored JSON after founder verifies PITR/restore.

select jsonb_build_object(
  'build', 580,
  'probe_version', 1,
  'captured_at', now(),
  'database', current_database(),
  'project_ref_expected', 'bztwutzprwsdrtqdpymf',
  'pg_version', current_setting('server_version'),
  'schema_migrations_tracked', (select count(*)::int from supabase_migrations.schema_migrations),
  'migration_files_expected', jsonb_build_array(
    '136_passport_holder_subjects.sql',
    '137_idv_holder_subject_columns.sql',
    '138_sovereign_idv_evidence_custody.sql',
    '139_sovereign_idv_claims_evidence.sql',
    '140_passport_reusable_credential_state.sql',
    '141_passport_institutional_presentation_consent.sql',
    '142_passport_institutional_authorization_commits.sql',
    '143_passport_authorization_signing_claim.sql'
  ),
  'prerequisites', jsonb_build_object(
    'passport_holder_subjects', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_holder_subjects'),
    'passport_holder_wallet_accounts', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_holder_wallet_accounts'),
    'passport_holder_legacy_links', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_holder_legacy_links'),
    'identity_verifications_holder_subject_id', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name = 'identity_verifications' and column_name = 'holder_subject_id'
    ),
    'passport_idv_consent_records', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_idv_consent_records'),
    'sovereign_credential_issuance_audit', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'sovereign_credential_issuance_audit')
  ),
  'migrations_140_143', jsonb_build_object(
    'passport_holder_possession_keys', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_holder_possession_keys'),
    'passport_reusable_credentials', exists (select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_reusable_credentials'),
    'linked_credential_jti', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name = 'passport_reusable_credentials' and column_name = 'linked_credential_jti'
    ),
    'passport_institutional_presentation_consents', exists (
      select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_institutional_presentation_consents'
    ),
    'passport_institutional_authorization_commits', exists (
      select 1 from information_schema.tables where table_schema='public' and table_name = 'passport_institutional_authorization_commits'
    ),
    'signing_claim_token', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name = 'passport_institutional_authorization_commits' and column_name = 'signing_claim_token'
    ),
    'consume_passport_possession_challenge', exists (
      select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'consume_passport_possession_challenge'
    )
  ),
  'legacy_identity_columns', jsonb_build_object(
    'identity_verifications_sui_address', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name = 'identity_verifications' and column_name = 'sui_address'
    ),
    'identity_verifications_wallet_address', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name = 'identity_verifications' and column_name = 'wallet_address'
    )
  ),
  'partial_object_drift', (
    select coalesce(jsonb_agg(key), '[]'::jsonb)
    from (
      select 'passport_holder_subjects' as key where exists (select 1 from information_schema.tables where table_name='passport_holder_subjects')
      union all select 'passport_reusable_credentials' where exists (select 1 from information_schema.tables where table_name='passport_reusable_credentials')
      union all select 'identity_verifications_holder_subject_id' where exists (
        select 1 from information_schema.columns where table_name='identity_verifications' and column_name='holder_subject_id'
      )
    ) partial
  ),
  'backup_attestation', jsonb_build_object(
    'pitr_checkpoint_id', null,
    'restore_test_completed', false,
    'attested_at', null,
    'operator_note', 'Populate after founder verifies Supabase backup/PITR restore test.'
  ),
  'passport_table_inventory', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from (select table_name from information_schema.tables where table_schema = 'public' and table_name like 'passport%' order by table_name) t
  )
) as production_migration_release_gates_report;
