// FILE: lib/partner/valueEvidence/caseStudyReadiness.ts
// Case-study readiness — measured vs operator-required gaps.

import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { CaseStudyReadiness, PolicyExpansionEvidence } from "./contract";
import type { DurationMetric } from "./contract";
import type { CommercialStateRow } from "./store";

export function buildCaseStudyReadiness(input: {
  pilotSandbox: PartnerPilotSummary;
  pilotProduction: PartnerPilotSummary | null;
  velocity: Record<string, DurationMetric>;
  policyExpansion: PolicyExpansionEvidence;
  commercial: CommercialStateRow | null;
}): CaseStudyReadiness {
  const sandbox = input.pilotSandbox;
  const production = input.pilotProduction;
  const measured: string[] = [];
  const missing: string[] = [];
  const safeClaims: string[] = [];
  const questions: string[] = [];

  if (input.velocity.application_created_to_first_successful_verification.quality === "measured") {
    measured.push("first_sandbox_verification_latency");
    safeClaims.push("First successful sandbox verification timestamp is recorded.");
  } else {
    missing.push("first_sandbox_verification");
  }

  if (sandbox.production_status.activated) {
    measured.push("production_activation");
    safeClaims.push("Production activation is recorded.");
  } else {
    missing.push("production_activation");
  }

  if (sandbox.metrics.verification_attempts.value > 0) {
    measured.push("verification_attempts");
    safeClaims.push(`${sandbox.metrics.verification_attempts.value} verification attempts observed (sandbox scope).`);
  }
  if (sandbox.metrics.successful_receipt_verifications.value > 0) {
    measured.push("successful_verifications");
  }
  if (sandbox.metrics.evidence_reuse_count.value > 0) {
    measured.push("evidence_reuse_events");
    safeClaims.push("Evidence reuse events observed.");
  }
  if (sandbox.privacy_facts.length > 0) {
    measured.push("privacy_minimization_contract");
    safeClaims.push("Policy-specific disclosure contracts documented.");
  }
  if (input.policyExpansion.policy_expansion_observed) {
    measured.push("policy_expansion");
  }

  missing.push("customer_quote");
  missing.push("operational_cost_impact");
  missing.push("commercial_outcome");
  missing.push("customer_reported_roi");

  questions.push("Can the partner provide a quote approved for external use?");
  questions.push("What operational impact did verification reuse have in their workflow?");
  questions.push("What is the commercial outcome of the pilot?");

  return {
    integration_velocity: input.velocity.application_created_to_first_successful_verification.quality === "measured" ? "ready" : "missing",
    production_usage: production && production.metrics.total_requests.value > 0 ? "ready" : "missing",
    verification_success: sandbox.metrics.verification_attempts.value > 0 ? "ready" : "missing",
    evidence_reuse: sandbox.metrics.evidence_reuse_count.value > 0 ? "ready" : "missing",
    privacy_minimization: sandbox.privacy_facts.length > 0 ? "ready" : "missing",
    policy_expansion: input.policyExpansion.policy_expansion_observed ? "ready" : "missing",
    customer_quote: "operator_required",
    customer_roi: "unavailable",
    commercial_status: input.commercial?.commercial_converted ? "recorded" : "operator_required",
    measured_evidence: measured,
    missing_evidence: missing,
    safe_claims_today: safeClaims,
    partner_questions: questions,
  };
}
