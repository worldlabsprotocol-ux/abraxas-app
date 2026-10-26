// FILE: lib/decisionReceipts/evidenceMigrationReadiness.ts
// Authoritative migration dependency graph for evidence + receipt v1.1 rollout (read-only planning).

export type EvidenceMigrationRole =
  | "receipt_issuance"
  | "evidence_reuse"
  | "evidence_revocation"
  | "signed_current_status"
  | "independent_verification"
  | "optional_admin";

export type EvidenceMigrationNode = {
  migration_file: string;
  creates: string[];
  prerequisites: string[];
  roles: EvidenceMigrationRole[];
};

/** Minimum Demo-safe order before migrations 151→152→153. */
export const DEMO_EVIDENCE_V11_MIGRATION_ORDER = [
  "033_decision_receipts.sql",
  "034_credential_status_registry.sql",
  "059_decision_receipt_revocation_events.sql",
  "093_reusable_eligibility_facts.sql",
  "113_decision_receipt_evidence_dependencies.sql",
  "151_decision_receipt_issuance_finalization.sql",
  "152_decision_receipt_v1_1_signed_fields.sql",
  "153_decision_receipt_v11_finalize_atomic.sql",
] as const;

export const EVIDENCE_MIGRATION_GRAPH: EvidenceMigrationNode[] = [
  {
    migration_file: "033_decision_receipts.sql",
    creates: ["decision_receipts"],
    prerequisites: ["verification_decisions", "consent_receipts"],
    roles: ["receipt_issuance", "independent_verification", "signed_current_status"],
  },
  {
    migration_file: "034_credential_status_registry.sql",
    creates: ["credential_status_events", "receipt_claim_dependencies"],
    prerequisites: ["033_decision_receipts.sql", "credential_claims"],
    roles: ["receipt_issuance", "independent_verification"],
  },
  {
    migration_file: "059_decision_receipt_revocation_events.sql",
    creates: ["decision_receipt_revocation_events"],
    prerequisites: ["033_decision_receipts.sql", "034_credential_status_registry.sql"],
    roles: ["evidence_revocation", "signed_current_status", "optional_admin"],
  },
  {
    migration_file: "093_reusable_eligibility_facts.sql",
    creates: ["reusable_eligibility_facts", "reusable_eligibility_derivations"],
    prerequisites: ["033_decision_receipts.sql", "059_decision_receipt_revocation_events.sql"],
    roles: ["evidence_reuse", "receipt_issuance"],
  },
  {
    migration_file: "113_decision_receipt_evidence_dependencies.sql",
    creates: ["decision_receipt_evidence_dependencies"],
    prerequisites: ["093_reusable_eligibility_facts.sql"],
    roles: ["evidence_reuse", "signed_current_status", "independent_verification"],
  },
  {
    migration_file: "151_decision_receipt_issuance_finalization.sql",
    creates: [],
    prerequisites: ["033_decision_receipts.sql"],
    roles: ["receipt_issuance"],
  },
  {
    migration_file: "152_decision_receipt_v1_1_signed_fields.sql",
    creates: [],
    prerequisites: ["151_decision_receipt_issuance_finalization.sql"],
    roles: ["independent_verification", "signed_current_status"],
  },
  {
    migration_file: "153_decision_receipt_v11_finalize_atomic.sql",
    creates: ["abraxas_finalize_v11_receipt_atomic"],
    prerequisites: ["152_decision_receipt_v1_1_signed_fields.sql", "113_decision_receipt_evidence_dependencies.sql"],
    roles: ["receipt_issuance", "evidence_reuse"],
  },
];

export type DemoEvidencePreflightProbe = {
  decision_receipt_evidence_dependencies: boolean;
  decision_receipt_revocation_events: boolean;
  reusable_eligibility_facts: boolean;
  reusable_eligibility_derivations: boolean;
  migration_151_applied: boolean;
  migration_152_applied: boolean;
  migration_153_applied: boolean;
};

export function demoBlocksV11UntilEvidenceLayer(probe: DemoEvidencePreflightProbe): string[] {
  const blockers: string[] = [];
  if (!probe.decision_receipt_revocation_events) {
    blockers.push("apply_059_revocation_events_before_reuse_rollout");
  }
  if (!probe.decision_receipt_evidence_dependencies) {
    blockers.push("apply_113_evidence_dependencies_before_v11_finalize");
  }
  if (!probe.migration_151_applied) blockers.push("apply_151_issuance_finalization");
  if (!probe.migration_152_applied) blockers.push("apply_152_v11_signed_fields");
  if (!probe.migration_153_applied) blockers.push("apply_153_atomic_finalize_rpc");
  return blockers;
}
