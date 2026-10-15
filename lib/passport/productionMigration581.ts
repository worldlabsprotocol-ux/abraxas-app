// FILE: lib/passport/productionMigration581.ts
// Build #581: Production migration execution readiness (Phase A) and authorization boundary (Phase B).

import {
  evaluateProductionMigrationRelease,
  PRODUCTION_SUPABASE_PROJECT_REF,
  SOVEREIGN_PASSPORT_MIGRATION_FILES,
  type ProductionMigrationPreflightReport,
  type ProductionMigrationReleaseEvaluation,
  type ReleaseGateRow,
} from "./productionMigrationRelease";
import type { LoadedProductionPreflight } from "./productionPreflightEvidence";
import type { HolderReconciliationInventory } from "./productionHolderReconciliationInventory";

export const BUILD_581 = 581 as const;
export const PRODUCTION_MIGRATION_EXECUTE_TOKEN = "build581-passport-136-143-execute" as const;
export const PRODUCTION_MIGRATION_DDL_AUTHORIZED_ENV = "ABRAXAS_PRODUCTION_MIGRATION_DDL_AUTHORIZED";
export const PRODUCTION_MIGRATION_REHEARSAL_ATTESTED_ENV = "ABRAXAS_PRODUCTION_MIGRATION_REHEARSAL_ATTESTED";
export const PRODUCTION_MIGRATION_EXECUTION_NONCE_ENV = "ABRAXAS_PRODUCTION_MIGRATION_EXECUTION_NONCE";
export const CANONICAL_PRODUCT_URL = "https://abraxasworld.xyz" as const;

export type ProductionMigration581Evaluation = Omit<ProductionMigrationReleaseEvaluation, "build"> & {
  build: typeof BUILD_581;
  phase: "A_preparation" | "B_execution_ready" | "blocked";
  preflight_stale: boolean;
  preflight_source: string | null;
  preflight_captured_at_ms: number | null;
  rehearsal_attested: boolean;
  ddl_execution_authorized: boolean;
  canonical_product_ref: string;
  gates: ReleaseGateRow[];
  reconciliation_inventory_present: boolean;
};

/** Registered execution nonce must match at invoke time (not durable single-use consumption). */
export function verifyProductionMigrationExecutionNonce(
  env: Record<string, string | undefined>,
  submittedNonce: string,
): { ok: true } | { ok: false; code: string; detail: string } {
  const expected = env[PRODUCTION_MIGRATION_EXECUTION_NONCE_ENV]?.trim();
  if (!expected) {
    return {
      ok: false,
      code: "execution_nonce_not_registered",
      detail: "Register ABRAXAS_PRODUCTION_MIGRATION_EXECUTION_NONCE before invoking the executor.",
    };
  }
  if (expected !== submittedNonce.trim()) {
    return { ok: false, code: "execution_nonce_mismatch", detail: "Registered execution nonce mismatch." };
  }
  return { ok: true };
}

export function verifyProductionDdlExecutionAuthorization(env: Record<string, string | undefined> = process.env): {
  ok: boolean;
  code: string;
  detail: string;
} {
  const founderAuth = env.ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED?.trim().toLowerCase() === "true";
  const founderAck = env.ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID?.trim() ?? "";
  const releaseToken = env.ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN?.trim() ?? "";
  const ddlAuthorized = env[PRODUCTION_MIGRATION_DDL_AUTHORIZED_ENV]?.trim().toLowerCase() === "true";
  const operatorId = env.ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ID?.trim() ?? "";
  const operatorAck = env.ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ACK?.trim() ?? "";

  if (!founderAuth || founderAck.length < 8) {
    return { ok: false, code: "founder_authorization_missing", detail: "Founder migration authorization incomplete." };
  }
  if (releaseToken !== PRODUCTION_MIGRATION_EXECUTE_TOKEN) {
    return { ok: false, code: "release_token_mismatch", detail: "Production execute release token must match Build #581 scope." };
  }
  if (!ddlAuthorized) {
    return { ok: false, code: "ddl_not_authorized", detail: "Explicit DDL authorization env is required (not a generic execute flag)." };
  }
  if (!operatorId || operatorAck.length < 8 || operatorAck !== operatorId) {
    return { ok: false, code: "operator_authorization_invalid", detail: "Operator migration ack must match registered operator id." };
  }
  return { ok: true, code: "authorized", detail: "Phase B DDL authorization signals present." };
}

export function evaluateProductionMigration581(input: {
  preflight: ProductionMigrationPreflightReport;
  preflightEvidence?: LoadedProductionPreflight | null;
  env?: Record<string, string | undefined>;
  verifiedDatabaseProjectRef?: string | null;
  reconciliationInventory?: HolderReconciliationInventory | null;
}): ProductionMigration581Evaluation {
  const env = input.env ?? process.env;
  const base = evaluateProductionMigrationRelease({
    preflight: input.preflight,
    env,
    verifiedDatabaseProjectRef: input.verifiedDatabaseProjectRef,
    founderReleaseTokenPolicy: "omit",
  });

  const gates: ReleaseGateRow[] = [...base.gates];
  const stale = input.preflightEvidence?.stale ?? true;
  gates.push({
    gate: "preflight_freshness",
    status: input.preflightEvidence && !stale ? "pass" : "fail",
    detail: !input.preflightEvidence
      ? "Load preflight JSON from read-only Production probes before trusting gate status."
      : stale
        ? "Preflight evidence is missing captured_at or exceeds max age; refresh before Phase B."
        : `Preflight captured ${input.preflightEvidence.ageHours.toFixed(2)}h ago (within policy).`,
  });

  const rehearsalAttested =
    env[PRODUCTION_MIGRATION_REHEARSAL_ATTESTED_ENV]?.trim().toLowerCase() === "true";
  gates.push({
    gate: "disposable_rehearsal",
    status: rehearsalAttested ? "pass" : "manual_required",
    detail: rehearsalAttested
      ? "Disposable migration rehearsal attested on founder record."
      : "Run migrations 136–143 on disposable PostgreSQL and attest before Production DDL.",
  });

  const ddlAuth = verifyProductionDdlExecutionAuthorization(env);
  gates.push({
    gate: "phase_b_ddl_authorization",
    status: ddlAuth.ok ? "pass" : "blocked",
    detail: ddlAuth.detail,
  });

  const inventoryPresent = Boolean(input.reconciliationInventory);
  gates.push({
    gate: "reconciliation_inventory",
    status: inventoryPresent ? "pass" : "manual_required",
    detail: inventoryPresent
      ? "Aggregate holder reconciliation inventory captured (no PII)."
      : "Run read-only reconciliation inventory SQL before holder backfill planning.",
  });

  const schemaReady =
    base.dry_run_preflight_ok
    && base.backup_restore_confirmed
    && !base.schema_drift_detected;
  const phaseBReady =
    schemaReady
    && !stale
    && rehearsalAttested
    && ddlAuth.ok
    && inventoryPresent
    && input.verifiedDatabaseProjectRef === PRODUCTION_SUPABASE_PROJECT_REF;

  gates.push({
    gate: "phase_b_execution_ready",
    status: phaseBReady ? "pass" : "blocked",
    detail: phaseBReady
      ? "All Phase B gates satisfied; controlled executor may run with registered execution nonce."
      : "Phase B remains blocked until freshness, rehearsal, backup, inventory, and dual authorization align.",
  });

  return {
    ...base,
    build: BUILD_581,
    phase: phaseBReady ? "B_execution_ready" : base.dry_run_preflight_ok ? "A_preparation" : "blocked",
    preflight_stale: stale,
    preflight_source: input.preflightEvidence?.source ?? null,
    preflight_captured_at_ms: input.preflightEvidence?.capturedAtMs ?? null,
    rehearsal_attested: rehearsalAttested,
    ddl_execution_authorized: ddlAuth.ok,
    canonical_product_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    gates,
    reconciliation_inventory_present: inventoryPresent,
    production_execution_blocked: !phaseBReady,
  };
}

export const POSTMIGRATION_ACCEPTANCE_CHECKLIST = [
  "Verify all migrations 136–143 recorded with checksum and success outcome",
  "Confirm no partial schema drift via production-migration-release-gates.sql",
  "Validate RLS policies and grants on new Passport tables",
  "Smoke PostgREST routes used by /passport and admin operator APIs",
  "Confirm existing holders authenticate (wallet and legacy paths)",
  "Confirm legacy identity_verifications and review tables unchanged row counts",
  "Run holder reconciliation dry-run audits; zero unexplained merges",
  "Verify Passport lifecycle API states match holder UI",
  "Confirm issuer signing and public issuance remain disabled",
  "Confirm no unintended credential rows in passport_reusable_credentials",
  "Partner and institutional sandbox routes respond without regression",
] as const;

export const FOUNDER_PHASE_B_APPROVALS = [
  "Authorize Supabase backup checkpoint and completed restore test evidence",
  "Authorize Production project ref bztwutzprwsdrtqdpymf as migration target",
  "Authorize migration set 136–143 only (no ad-hoc DDL)",
  `Set ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN=${PRODUCTION_MIGRATION_EXECUTE_TOKEN}`,
  `Set ${PRODUCTION_MIGRATION_DDL_AUTHORIZED_ENV}=true after review`,
  "Register ABRAXAS_PRODUCTION_MIGRATION_EXECUTION_NONCE matching the executor invocation",
  "Approve holder reconciliation execute batch separately after schema verification",
] as const;

export { PRODUCTION_SUPABASE_PROJECT_REF, SOVEREIGN_PASSPORT_MIGRATION_FILES };
