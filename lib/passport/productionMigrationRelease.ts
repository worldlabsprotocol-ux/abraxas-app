// FILE: lib/passport/productionMigrationRelease.ts
// Build #580: guarded Production migration release gates (dry-run validation; no DDL).

export const PRODUCTION_SUPABASE_PROJECT_REF = "bztwutzprwsdrtqdpymf" as const;

/** Ordered sovereign Passport migrations (136–143). */
export const SOVEREIGN_PASSPORT_MIGRATION_FILES = [
  "136_passport_holder_subjects.sql",
  "137_idv_holder_subject_columns.sql",
  "138_sovereign_idv_evidence_custody.sql",
  "139_sovereign_idv_claims_evidence.sql",
  "140_passport_reusable_credential_state.sql",
  "141_passport_institutional_presentation_consent.sql",
  "142_passport_institutional_authorization_commits.sql",
  "143_passport_authorization_signing_claim.sql",
] as const;

export type ProductionMigrationPreflightReport = {
  build?: number;
  project_ref_expected?: string;
  prerequisites?: Record<string, boolean>;
  migrations_140_143?: Record<string, boolean>;
  legacy_identity_columns?: Record<string, boolean>;
  schema_migrations_tracked?: number;
  public_table_count?: number;
  backup_attestation?: {
    pitr_checkpoint_id?: string | null;
    restore_test_completed?: boolean;
    attested_at?: string | null;
  };
};

export type ReleaseGateStatus = "pass" | "fail" | "warn" | "blocked" | "manual_required";

export type ReleaseGateRow = {
  gate: string;
  status: ReleaseGateStatus;
  detail: string;
};

export type ProductionMigrationReleaseEvaluation = {
  build: 580;
  production_execution_blocked: boolean;
  dry_run_preflight_ok: boolean;
  gates: ReleaseGateRow[];
  migration_apply_pending: boolean;
  schema_drift_detected: boolean;
  backup_restore_confirmed: boolean;
};

function allFalse(obj: Record<string, boolean> | undefined): boolean {
  if (!obj) return false;
  const values = Object.values(obj);
  return values.length > 0 && values.every((v) => v === false);
}

function anyTrue(obj: Record<string, boolean> | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => v === true);
}

function partialMigrationState(prereq: Record<string, boolean> | undefined, m140: Record<string, boolean> | undefined): boolean {
  const pAny = anyTrue(prereq);
  const mAny = anyTrue(m140);
  const pAll = prereq && Object.values(prereq).every(Boolean);
  const mAll = m140 && Object.values(m140).every(Boolean);
  return (pAny || mAny) && !(pAll && mAll);
}

export function evaluateProductionMigrationRelease(input: {
  preflight: ProductionMigrationPreflightReport;
  env?: Record<string, string | undefined>;
}): ProductionMigrationReleaseEvaluation {
  const gates: ReleaseGateRow[] = [];
  const env = input.env ?? {};

  const projectOk =
    !input.preflight.project_ref_expected
    || input.preflight.project_ref_expected === PRODUCTION_SUPABASE_PROJECT_REF;
  gates.push({
    gate: "database_identity",
    status: projectOk ? "pass" : "fail",
    detail: projectOk
      ? `Production Supabase ref ${PRODUCTION_SUPABASE_PROJECT_REF} confirmed.`
      : "Preflight project ref does not match authorized Production database.",
  });

  const legacySui = input.preflight.legacy_identity_columns?.identity_verifications_sui_address === true;
  gates.push({
    gate: "legacy_idv_anchor",
    status: legacySui ? "pass" : "fail",
    detail: legacySui
      ? "Legacy identity_verifications.sui_address present (holder continuity anchor)."
      : "Missing legacy sui_address column; cannot safely reconcile existing holders.",
  });

  const drift = partialMigrationState(input.preflight.prerequisites, input.preflight.migrations_140_143);
  gates.push({
    gate: "schema_drift",
    status: drift ? "fail" : "pass",
    detail: drift
      ? "Partial 136–143 objects detected; stop and reconcile drift before applying remaining migrations."
      : "No partial sovereign Passport migration footprint detected.",
  });

  const applyPending =
    allFalse(input.preflight.prerequisites)
    && allFalse(input.preflight.migrations_140_143);
  gates.push({
    gate: "migration_baseline",
    status: applyPending ? "warn" : anyTrue(input.preflight.migrations_140_143) ? "pass" : "fail",
    detail: applyPending
      ? "Production baseline matches pre-migration state; migrations 136–143 not yet applied."
      : "Post-migration verification required (objects present).",
  });

  const backupId = env.ABRAXAS_FOUNDER_BACKUP_CHECKPOINT_ID?.trim()
    || input.preflight.backup_attestation?.pitr_checkpoint_id?.trim()
    || "";
  const restoreTested =
    env.ABRAXAS_FOUNDER_BACKUP_RESTORE_TESTED?.trim().toLowerCase() === "true"
    || input.preflight.backup_attestation?.restore_test_completed === true;
  const backupOk = Boolean(backupId) && restoreTested;
  gates.push({
    gate: "backup_and_restore",
    status: backupOk ? "pass" : "manual_required",
    detail: backupOk
      ? "Backup checkpoint and restore test attested."
      : "Record PITR/on-demand backup checkpoint and complete restore test before Production DDL.",
  });

  const founderAuth =
    env.ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED?.trim().toLowerCase() === "true";
  const founderAck = env.ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID?.trim() ?? "";
  const releaseToken = env.ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN?.trim() ?? "";
  const executionArmed =
    founderAuth
    && founderAck.length >= 8
    && releaseToken === "build580-passport-136-143"
    && backupOk
    && !drift;

  gates.push({
    gate: "founder_execution_authorization",
    status: executionArmed ? "pass" : "blocked",
    detail: executionArmed
      ? "All founder authorization gates satisfied (this build still does not auto-execute DDL)."
      : "Production DDL requires founder authorization, matching release token, backup attestation, and zero schema drift.",
  });

  const dryRunOk = projectOk && legacySui && !drift;
  const production_execution_blocked = !executionArmed;

  return {
    build: 580,
    production_execution_blocked,
    dry_run_preflight_ok: dryRunOk,
    gates,
    migration_apply_pending: applyPending,
    schema_drift_detected: drift,
    backup_restore_confirmed: backupOk,
  };
}

export const PRODUCTION_RELEASE_SEQUENCE = [
  "Confirm Production schema and database identity",
  "Confirm backup and tested restoration",
  "Run authorized migration preflight (578/579/580 SQL)",
  "Validate migration execution on disposable PostgreSQL",
  "Review legacy identity reconciliation plan results",
  "Obtain founder approval for Production migration",
  "Apply approved schema changes under controlled execution",
  "Verify schema integrity and existing application behavior",
  "Run authorized holder reconciliation with audit records",
  "Verify authenticated holder and Passport continuity",
  "Configure hybrid connection and database privileges",
  "Validate issuer, signing, receipt, and revocation infrastructure",
  "Authorize limited real credential issuance for approved test holder",
  "Witness consent and independent verification for two institutions",
  "Approve ongoing Production availability after evidence review",
] as const;
