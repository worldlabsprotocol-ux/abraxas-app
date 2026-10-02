// FILE: lib/operations/institutionalProof/assembleEvidencePacket.ts
// Assemble InstitutionalReusableKycEvidencePacket from scenario + readiness data.

import { auditInstitutionalProofSurfaces } from "./privacyAudit";
import { assessProductionReadiness } from "./readiness";
import { runInstitutionalSecurityFailureMatrix } from "./failureMatrix";
import type { ReferenceScenarioResult } from "./runReferenceScenario";
import type { InstitutionalReusableKycEvidencePacket, ProofEnvironment } from "./contract";
import {
  INSTITUTIONAL_PROOF_ARCHITECTURE_VERSION,
  INSTITUTIONAL_PROOF_RECEIPT_SCHEMA_VERSION,
  INSTITUTIONAL_PROOF_SCHEMA_VERSION,
} from "./contract";

function computeDecisionGate(scenario: ReferenceScenarioResult): "A" | "B" | "C" {
  if (scenario.failed) return "C";
  const requiredObserved = [
    "provider_evidence_authenticated",
    "subject_bound",
    "claim_normalized",
    "policy_evaluated",
    "receipt_issued",
    "application_a_verified",
    "reuse_available",
    "application_b_verified",
    "pairwise_isolation_verified",
    "revocation_received",
    "reuse_blocked_after_revocation",
  ];
  const observed = new Set(scenario.stages.filter((s) => s.status === "observed").map((s) => s.stage));
  const allObserved = requiredObserved.every((s) => observed.has(s as typeof scenario.stages[number]["stage"]));
  if (allObserved
    && scenario.operator_touch_count === 0
    && scenario.provider_verifications === 1
    && scenario.raw_kyc_recollections === 0
    && scenario.cross_application_pairwise_distinct
    && scenario.reuse_before_revocation === "reuse"
    && scenario.reuse_after_revocation !== "reuse") {
    return "A";
  }
  return "B";
}

export async function assembleInstitutionalEvidencePacket(input: {
  scenario: ReferenceScenarioResult;
  environment: ProofEnvironment;
}): Promise<InstitutionalReusableKycEvidencePacket> {
  const readiness = await assessProductionReadiness();
  if (input.environment === "reference_test") {
    readiness.production_db_status = "UNVERIFIED";
    readiness.status = "unverified";
    readiness.checks.migration_127_applied = "unverified";
  }
  const privacy = auditInstitutionalProofSurfaces({
    applicationA: input.scenario.privacy_surfaces_a,
    applicationB: input.scenario.privacy_surfaces_b,
    surfaces: ["public_receipt", "narrow_result"],
  });
  const securityFailures = await runInstitutionalSecurityFailureMatrix();

  const partnerVerifiedAt = input.scenario.partner_verified_at;
  const requestCreatedAt = input.scenario.request_created_at;
  const requestToVerified = partnerVerifiedAt
    ? new Date(partnerVerifiedAt).getTime() - new Date(requestCreatedAt).getTime()
    : null;
  const providerToVerified = partnerVerifiedAt && input.scenario.provider_event_received_at
    ? new Date(partnerVerifiedAt).getTime() - new Date(input.scenario.provider_event_received_at).getTime()
    : null;

  const limitations = [
    "Reference harness uses mock provider and in-memory/test DB adapter — not production.",
    "Timing metrics are REFERENCE_HARNESS_MEASUREMENT only — not SLA or production benchmark.",
    "Production migration 127 presence requires live DB probe — UNVERIFIED when DB unavailable.",
    "No real KYC vendor integrated; MockApprovedIdentityProvider only.",
    "KYB, KYT, and regulatory certification are out of scope.",
  ];
  if (readiness.production_db_status === "UNVERIFIED") {
    limitations.push("PRODUCTION_DB_STATUS=UNVERIFIED — repository presence of migration 127 does not imply applied production migration.");
  }

  return {
    schema_version: INSTITUTIONAL_PROOF_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    environment: input.environment,
    scenario: "institutional_reusable_kyc_reference",
    architecture_version: INSTITUTIONAL_PROOF_ARCHITECTURE_VERSION,
    receipt_schema_version: INSTITUTIONAL_PROOF_RECEIPT_SCHEMA_VERSION,
    readiness,
    stages: input.scenario.stages,
    funnel: {
      provider_verifications: input.scenario.provider_verifications,
      application_verifications: input.scenario.application_verifications,
      reuse_count: input.scenario.reuse_count,
      raw_kyc_recollections: input.scenario.raw_kyc_recollections,
    },
    metrics: {
      label: "REFERENCE_HARNESS_MEASUREMENT",
      request_to_verified_result_ms: requestToVerified,
      provider_event_to_verified_result_ms: providerToVerified,
      request_created_at: requestCreatedAt,
      provider_event_received_at: input.scenario.provider_event_received_at,
      claim_ready_at: input.scenario.claim_ready_at,
      receipt_issued_at: input.scenario.receipt_issued_at_app_a,
      partner_verified_at: partnerVerifiedAt,
    },
    privacy,
    pairwise: {
      application_a_pairwise_present: input.scenario.application_a.pairwise_present,
      application_b_pairwise_present: input.scenario.application_b.pairwise_present,
      cross_application_pairwise_distinct: input.scenario.cross_application_pairwise_distinct,
      signed_narrow_pairwise_match: input.scenario.signed_narrow_pairwise_match,
    },
    reuse: {
      reuse_before_revocation: input.scenario.reuse_before_revocation,
      reuse_after_revocation: input.scenario.reuse_after_revocation,
      same_source_evidence_internally: input.scenario.same_source_evidence_internally,
    },
    revocation: {
      revocation_event_authenticated: input.scenario.revocation_event_authenticated,
      source_claim_status_after_revocation: input.scenario.source_claim_status_after_revocation,
      current_validity_after_revocation:
        input.scenario.reuse_after_revocation !== "reuse" ? "invalid" : "valid",
    },
    security_failures: securityFailures,
    operator_burden: {
      operator_touch_count: input.scenario.operator_touch_count,
      touches: [],
    },
    limitations,
    decision_gate: computeDecisionGate(input.scenario),
    service_graph: input.scenario.service_graph,
  };
}
