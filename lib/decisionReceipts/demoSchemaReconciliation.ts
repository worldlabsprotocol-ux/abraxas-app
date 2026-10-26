// FILE: lib/decisionReceipts/demoSchemaReconciliation.ts
// Read-only Demo schema drift classification and minimum corrective plan (no SQL execution).

export type MigrationEffectClass =
  | "present_compatible"
  | "absent_safe_create"
  | "present_incompatible"
  | "blocked_missing_prerequisite"
  | "potentially_destructive";

export type DemoSchemaProbe = {
  project_ref: string;
  /** demo_ops.migration_ledger highest filename observed (informational). */
  migration_ledger_max: string | null;
  tables: {
    decision_receipts: boolean;
    reusable_eligibility_facts: boolean;
    reusable_eligibility_derivations: boolean;
    decision_receipt_revocation_events: boolean;
    decision_receipt_evidence_dependencies: boolean;
    receipt_claim_dependencies: boolean;
  };
  functions: {
    revoke_decision_receipt_atomic: boolean;
    revoke_derived_receipts_for_source: boolean;
    abraxas_finalize_v11_receipt_atomic: boolean;
  };
  decision_receipts: {
    status_check_includes_pending_finalization: boolean;
    has_v11_dedicated_columns: boolean;
    receipt_count: number;
    v10_count: number;
    v11_count: number;
    pending_count: number;
  };
  reusable_rows: {
    facts: number;
    derivations: number;
  };
};

export type ReconciliationStep = {
  migration_file: string;
  class: MigrationEffectClass;
  rationale: string;
};

/** Corrective sequence for Demo drift (093 present without 059) — do not re-run full history blindly. */
export function buildDemoCorrectivePlan(probe: DemoSchemaProbe): ReconciliationStep[] {
  const steps: ReconciliationStep[] = [];

  if (probe.tables.decision_receipts) {
    steps.push({
      migration_file: "033_decision_receipts.sql",
      class: "present_compatible",
      rationale: "Core receipt table and v1.0.0 rows must be preserved.",
    });
  }

  if (probe.tables.receipt_claim_dependencies) {
    steps.push({
      migration_file: "034_credential_status_registry.sql",
      class: "present_compatible",
      rationale: "Claim dependency registry already on Demo.",
    });
  }

  if (!probe.tables.decision_receipt_revocation_events || !probe.functions.revoke_decision_receipt_atomic) {
    steps.push({
      migration_file: "059_decision_receipt_revocation_events.sql",
      class: "absent_safe_create",
      rationale:
        "Required before reuse revocation chain; 093 function revoke_derived_receipts_for_source calls revoke_decision_receipt_atomic.",
    });
  } else {
    steps.push({
      migration_file: "059_decision_receipt_revocation_events.sql",
      class: "present_compatible",
      rationale: "Revocation audit already present.",
    });
  }

  if (probe.tables.reusable_eligibility_facts && probe.tables.reusable_eligibility_derivations) {
    steps.push({
      migration_file: "093_reusable_eligibility_facts.sql",
      class: "present_compatible",
      rationale: "Reuse tables match migration 093; idempotent re-apply only after 059, not required for empty tables.",
    });
  } else if (!probe.functions.revoke_decision_receipt_atomic) {
    steps.push({
      migration_file: "093_reusable_eligibility_facts.sql",
      class: "blocked_missing_prerequisite",
      rationale: "Do not first-apply 093 without 059 on environments that need derived revocation RPCs.",
    });
  } else {
    steps.push({
      migration_file: "093_reusable_eligibility_facts.sql",
      class: "absent_safe_create",
      rationale: "Reuse tables not yet present.",
    });
  }

  if (!probe.tables.decision_receipt_evidence_dependencies) {
    steps.push({
      migration_file: "113_decision_receipt_evidence_dependencies.sql",
      class: probe.tables.reusable_eligibility_facts ? "absent_safe_create" : "blocked_missing_prerequisite",
      rationale: "Evidence dependency persistence required for v1.1 commitment binding and reuse fail-closed reads.",
    });
  } else {
    steps.push({
      migration_file: "113_decision_receipt_evidence_dependencies.sql",
      class: "present_compatible",
      rationale: "Evidence dependency table already present.",
    });
  }

  if (!probe.decision_receipts.status_check_includes_pending_finalization) {
    steps.push({
      migration_file: "151_decision_receipt_issuance_finalization.sql",
      class: "absent_safe_create",
      rationale: "Adds pending_finalization without altering existing active v1.0.0 rows.",
    });
  }
  if (!probe.decision_receipts.has_v11_dedicated_columns) {
    steps.push({
      migration_file: "152_decision_receipt_v1_1_signed_fields.sql",
      class: "absent_safe_create",
      rationale: "Dedicated nullable v1.1 columns; no backfill in migration DDL.",
    });
  }
  if (!probe.functions.abraxas_finalize_v11_receipt_atomic) {
    steps.push({
      migration_file: "153_decision_receipt_v11_finalize_atomic.sql",
      class: probe.decision_receipts.has_v11_dedicated_columns ? "absent_safe_create" : "blocked_missing_prerequisite",
      rationale: "Atomic finalize RPC; requires 152 columns.",
    });
  }

  return steps;
}

export function inferDemoDriftRootCause(probe: DemoSchemaProbe): string {
  if (
    probe.tables.reusable_eligibility_facts
    && probe.functions.revoke_derived_receipts_for_source
    && !probe.functions.revoke_decision_receipt_atomic
  ) {
    return "093_applied_without_059: reuse tables/function exist but atomic revoke RPC missing (likely manual SQL outside demo_ops.migration_ledger).";
  }
  return "unknown_drift";
}

export function demoCorrectiveExecutionOrder(probe: DemoSchemaProbe): string[] {
  const order = [
    "059_decision_receipt_revocation_events.sql",
    "113_decision_receipt_evidence_dependencies.sql",
    "151_decision_receipt_issuance_finalization.sql",
    "152_decision_receipt_v1_1_signed_fields.sql",
    "153_decision_receipt_v11_finalize_atomic.sql",
  ];
  if (!probe.tables.reusable_eligibility_facts) {
    order.unshift("093_reusable_eligibility_facts.sql");
  }
  return order.filter((file) => {
    const step = buildDemoCorrectivePlan(probe).find((s) => s.migration_file === file);
    return step && step.class !== "present_compatible" && step.class !== "blocked_missing_prerequisite";
  });
}
