// FILE: lib/partner/build592/externalVerificationExecutionStatus.ts

export type ExecutionStepStatus = "passed" | "blocked" | "failed" | "not_attempted";

export interface ExternalVerificationExecutionReport {
  contract_version: "592.v2";
  synthetic_security_tests: ExecutionStepStatus;
  live_sandbox_http: ExecutionStepStatus;
  holder_authorization_completed: ExecutionStepStatus;
  authentic_signed_sandbox_receipt_obtained: ExecutionStepStatus;
  external_verifier_executed: ExecutionStepStatus;
  external_authorization_granted: ExecutionStepStatus;
  external_proof_record_generated: ExecutionStepStatus;
  overall_acceptance_completed: ExecutionStepStatus;
  evidence_references: {
    security_matrix_detail: string | null;
    live_http_journey_steps: string | null;
    holder_authorization_evidence: string | null;
    receipt_provenance: string | null;
    external_proof_contract: string | null;
  };
  diagnostic_command_ok: boolean;
}

export function liveHttpJourneyStatus(
  steps: Array<{ status: string }>,
): ExecutionStepStatus {
  if (steps.length === 0) return "not_attempted";
  if (steps.some((step) => step.status === "fail")) return "failed";
  if (steps.some((step) => step.status === "blocked")) return "blocked";
  if (steps.every((step) => step.status === "pass" || step.status === "skipped")) return "passed";
  return "blocked";
}

export function buildExternalVerificationExecutionReport(input: {
  syntheticSecurityPassed: boolean;
  liveHttpSteps: Array<{ status: string }>;
  holderAuthorizationConfirmed: boolean;
  holderAuthorizationEvidenceRef: string | null;
  receiptProvenance: "not_supplied" | "operator_supplied_file" | "live_sandbox_holder_flow";
  externalVerifierRan: boolean;
  externalAuthorizationGranted: boolean;
  externalProofGenerated: boolean;
  securityDetail: string | null;
}): ExternalVerificationExecutionReport {
  const synthetic_security_tests = input.syntheticSecurityPassed ? "passed" : "failed";

  const live_sandbox_http = liveHttpJourneyStatus(input.liveHttpSteps);

  const holder_authorization_completed = input.holderAuthorizationConfirmed
    ? "passed"
    : input.receiptProvenance === "live_sandbox_holder_flow"
      ? "blocked"
      : "not_attempted";

  let authentic_signed_sandbox_receipt_obtained: ExecutionStepStatus = "not_attempted";
  if (input.receiptProvenance === "live_sandbox_holder_flow" && input.holderAuthorizationConfirmed) {
    authentic_signed_sandbox_receipt_obtained = "passed";
  } else if (input.receiptProvenance === "operator_supplied_file") {
    authentic_signed_sandbox_receipt_obtained = "not_attempted";
  }

  const external_verifier_executed = input.externalVerifierRan ? "passed" : "not_attempted";
  const external_authorization_granted = input.externalAuthorizationGranted ? "passed" : "not_attempted";
  const external_proof_record_generated = input.externalProofGenerated ? "passed" : "not_attempted";

  const overall_acceptance_completed =
    synthetic_security_tests === "passed"
    && live_sandbox_http === "passed"
    && holder_authorization_completed === "passed"
    && authentic_signed_sandbox_receipt_obtained === "passed"
    && external_verifier_executed === "passed"
    && external_authorization_granted === "passed"
    && external_proof_record_generated === "passed"
      ? "passed"
      : overallBlockedOrNotAttempted({
          live_sandbox_http,
          holder_authorization_completed,
          authentic_signed_sandbox_receipt_obtained,
          external_verifier_executed,
          external_authorization_granted,
        });

  const diagnostic_command_ok = synthetic_security_tests !== "failed";

  return {
    contract_version: "592.v2",
    synthetic_security_tests,
    live_sandbox_http,
    holder_authorization_completed,
    authentic_signed_sandbox_receipt_obtained,
    external_verifier_executed,
    external_authorization_granted,
    external_proof_record_generated,
    overall_acceptance_completed,
    evidence_references: {
      security_matrix_detail: input.securityDetail,
      live_http_journey_steps: input.liveHttpSteps.length > 0 ? "live_institutional_http_journey" : null,
      holder_authorization_evidence: input.holderAuthorizationEvidenceRef,
      receipt_provenance: input.receiptProvenance,
      external_proof_contract: input.externalProofGenerated ? "592.v2" : null,
    },
    diagnostic_command_ok,
  };
}

function overallBlockedOrNotAttempted(input: {
  live_sandbox_http: ExecutionStepStatus;
  holder_authorization_completed: ExecutionStepStatus;
  authentic_signed_sandbox_receipt_obtained: ExecutionStepStatus;
  external_verifier_executed: ExecutionStepStatus;
  external_authorization_granted: ExecutionStepStatus;
}): ExecutionStepStatus {
  const values = Object.values(input);
  if (values.some((value) => value === "failed")) return "failed";
  if (values.some((value) => value === "blocked")) return "blocked";
  return "not_attempted";
}
