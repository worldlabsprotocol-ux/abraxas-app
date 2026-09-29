// FILE: lib/partner/designPartnerProgram/caseStudyArtifact.ts
// Internal case-study artifact — publication requires explicit permissions.

import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import type { DesignPartnerProgramRow } from "./contract";
import type { CaseStudyPermissionsRow, CustomerReportedEvidenceRow } from "./store";
import type { PilotScorecard } from "./contract";

export function buildCaseStudyArtifact(input: {
  program: DesignPartnerProgramRow;
  valueEvidence: ApplicationValueEvidence;
  scorecard: PilotScorecard | null;
  permissions: CaseStudyPermissionsRow | null;
  customerReported: CustomerReportedEvidenceRow[];
}): {
  partner_identity: { public_name_allowed: boolean; logo_allowed: boolean };
  use_case: string | null;
  before: { customer_reported_problem: string | null };
  implementation: {
    integration_time_ms: number | null;
    policies: string[];
    environment: string;
  };
  measured_results: Array<{ label: string; value: unknown; quality: string }>;
  customer_reported_results: Array<{ type: string; value: string; permission: string; quality: string }>;
  privacy_value: string[];
  quote: { text: string | null; permission: string };
  evidence_sources: string[];
  publishability: { status: "ready" | "partial" | "blocked"; blockers: string[] };
} {
  const permissions = input.permissions;
  const blockers: string[] = [];
  const quoteRow = input.customerReported.find((r) => r.evidence_type === "approved_quote");

  if (!permissions || permissions.public_case_study_permission !== "approved") {
    blockers.push("public_case_study_permission");
  }
  if (!permissions || permissions.company_name_permission !== "approved") {
    blockers.push("company_name_permission");
  }
  if (quoteRow && permissions?.quote_permission !== "approved") {
    blockers.push("quote_permission");
  }
  if (permissions?.metrics_permission !== "approved") {
    blockers.push("metrics_permission");
  }

  const velocity = input.valueEvidence.integration_velocity.application_created_to_first_successful_verification
    ?? { duration_ms: null, quality: "unavailable" as const, start_event: "application.created_at", end_event: "receipt_verification_succeeded" };
  const measuredResults = [
    { label: "successful_verifications", value: input.valueEvidence.pilot_sandbox.metrics.successful_receipt_verifications.value, quality: "system_measured" },
    { label: "verification_success_rate", value: input.valueEvidence.pilot_sandbox.metrics.verification_success_rate.value, quality: "derived" },
    { label: "evidence_reuse_count", value: input.valueEvidence.pilot_sandbox.metrics.evidence_reuse_count.value, quality: "system_measured" },
    { label: "integration_time_ms", value: velocity.duration_ms, quality: velocity.quality },
  ];

  const customerReported = input.customerReported.map((r) => ({
    type: r.evidence_type,
    value: r.safe_value,
    permission: r.permission_status,
    quality: "customer_reported",
  }));

  const problem = input.customerReported.find((r) => r.evidence_type === "customer_reported_problem");

  let publishStatus: "ready" | "partial" | "blocked" = "blocked";
  if (blockers.length === 0) publishStatus = "ready";
  else if (blockers.length < 3 && measuredResults.some((m) => m.value != null && m.value !== 0)) publishStatus = "partial";

  return {
    partner_identity: {
      public_name_allowed: permissions?.company_name_permission === "approved",
      logo_allowed: permissions?.logo_permission === "approved",
    },
    use_case: input.program.primary_use_case,
    before: { customer_reported_problem: problem?.safe_value ?? null },
    implementation: {
      integration_time_ms: velocity.duration_ms,
      policies: input.valueEvidence.policy_expansion_production.policies_used.length > 0
        ? input.valueEvidence.policy_expansion_production.policies_used
        : input.valueEvidence.pilot_sandbox.policy_consumption.map((p) => p.pack_id ?? p.policy_id),
      environment: input.program.pilot_environment,
    },
    measured_results: measuredResults,
    customer_reported_results: customerReported,
    privacy_value: input.valueEvidence.pilot_sandbox.privacy_facts.map((f) => f.statement),
    quote: {
      text: quoteRow?.safe_value ?? null,
      permission: permissions?.quote_permission ?? "pending",
    },
    evidence_sources: ["partner_integration_events", "partner_design_partner_program", "partner_case_study_permissions"],
    publishability: { status: publishStatus, blockers },
  };
}
