// FILE: lib/operations/institutionalProof/renderReport.ts
// Deterministic human-readable report from evidence packet.

import type { InstitutionalReusableKycEvidencePacket } from "./contract";

export function renderInstitutionalProofReport(packet: InstitutionalReusableKycEvidencePacket): string {
  const envLabel = packet.environment === "reference_test"
    ? "reference harness"
    : packet.environment;

  const lines: string[] = [
    "# Institutional Reusable-KYC Proof Report",
    "",
    `**Environment:** ${envLabel}`,
    `**Generated:** ${packet.generated_at}`,
    `**Decision gate:** ${packet.decision_gate}`,
    "",
    "## WHAT WAS PROVEN?",
    "",
  ];

  for (const stage of packet.stages) {
    lines.push(`- **${stage.stage}:** ${stage.status}${stage.failure_category ? ` (${stage.failure_category})` : ""}`);
  }

  lines.push(
    "",
    "## HOW MANY TIMES WAS THE USER VERIFIED BY THE PROVIDER?",
    "",
    `${packet.funnel.provider_verifications} authenticated provider verification event(s).`,
    "",
    "## DID APPLICATION B REUSE EXISTING EVIDENCE?",
    "",
    `Reuse before revocation: **${packet.reuse.reuse_before_revocation}**.`,
    `Same underlying source evidence (internal assertion): **${packet.reuse.same_source_evidence_internally}**.`,
    `Raw KYC recollections: **${packet.funnel.raw_kyc_recollections}**.`,
    "",
    "## DID THE TWO APPLICATIONS RECEIVE DIFFERENT PUBLIC IDENTIFIERS?",
    "",
    `- Application A pairwise present: ${packet.pairwise.application_a_pairwise_present}`,
    `- Application B pairwise present: ${packet.pairwise.application_b_pairwise_present}`,
    `- Cross-application distinct: ${packet.pairwise.cross_application_pairwise_distinct}`,
    `- Signed receipt matches narrow pairwise ref: ${packet.pairwise.signed_narrow_pairwise_match}`,
    "",
    "## DID EITHER APPLICATION RECEIVE RAW KYC?",
    "",
    `Forbidden field count across scanned surfaces: **${packet.privacy.forbidden_field_count}** (expected 0).`,
    "",
    "## WHAT HAPPENED AFTER REVOCATION?",
    "",
    `- Revocation event authenticated: ${packet.revocation.revocation_event_authenticated}`,
    `- Source claim status after revocation: ${packet.revocation.source_claim_status_after_revocation}`,
    `- Reuse after revocation: ${packet.reuse.reuse_after_revocation}`,
    `- Current validity: ${packet.revocation.current_validity_after_revocation}`,
    "",
    "## HOW MANY ABRAXAS OPERATOR ACTIONS WERE REQUIRED?",
    "",
    `**${packet.operator_burden.operator_touch_count}** operator actions during steady-state scenario.`,
    "",
    "## REFERENCE TIMING (NOT PRODUCTION SLA)",
    "",
    `Label: ${packet.metrics.label}`,
    `- Request to verified result: ${packet.metrics.request_to_verified_result_ms ?? "n/a"} ms`,
    `- Provider event to verified result: ${packet.metrics.provider_event_to_verified_result_ms ?? "n/a"} ms`,
    "",
    "## PRODUCTION READINESS",
    "",
    `Status: **${packet.readiness.status}**`,
    `Production DB: **${packet.readiness.production_db_status}**`,
    "",
    "## WHAT WAS NOT PROVEN?",
    "",
  );

  for (const limitation of packet.limitations) {
    lines.push(`- ${limitation}`);
  }

  lines.push(
    "",
    "## SECURITY FAILURE MATRIX",
    "",
  );
  for (const failure of packet.security_failures) {
    lines.push(`- ${failure.scenario}: ${failure.passed ? "pass" : "fail"} (${failure.expected_category})`);
  }

  return lines.join("\n");
}
