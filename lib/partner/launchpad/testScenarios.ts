// FILE: lib/partner/launchpad/testScenarios.ts
// Sandbox test scenario definitions for the Partner Launchpad test console.

export type LaunchpadTestScenarioId =
  | "eligible"
  | "ineligible"
  | "user_cancelled"
  | "receipt_expired"
  | "invalid_audience"
  | "revoked_credential"
  | "signing_unavailable"
  | "callback_unavailable"
  | "invalid_return_url";

export interface LaunchpadTestScenario {
  id: LaunchpadTestScenarioId;
  label: string;
  description: string;
  expectedPublicCode: string;
  simulated: true;
}

export const LAUNCHPAD_TEST_SCENARIOS: LaunchpadTestScenario[] = [
  {
    id: "eligible",
    label: "Eligible visitor",
    description: "Policy evaluation approves and issues a signed sandbox receipt.",
    expectedPublicCode: "approved",
    simulated: true,
  },
  {
    id: "ineligible",
    label: "Ineligible visitor",
    description: "Policy evaluation denies without exposing private eligibility inputs.",
    expectedPublicCode: "denied",
    simulated: true,
  },
  {
    id: "user_cancelled",
    label: "User cancelled",
    description: "Visitor exits before consent is granted.",
    expectedPublicCode: "cancelled",
    simulated: true,
  },
  {
    id: "receipt_expired",
    label: "Receipt expired",
    description: "Verification succeeds but receipt is past expiration during server verify.",
    expectedPublicCode: "receipt_expired",
    simulated: true,
  },
  {
    id: "invalid_audience",
    label: "Invalid audience",
    description: "Receipt verification fails because partner audience does not match.",
    expectedPublicCode: "audience_mismatch",
    simulated: true,
  },
  {
    id: "revoked_credential",
    label: "Revoked credential",
    description: "API credential revocation blocks receipt verification.",
    expectedPublicCode: "credential_revoked",
    simulated: true,
  },
  {
    id: "signing_unavailable",
    label: "Signing unavailable",
    description: "Signing configuration missing. Verification fails closed.",
    expectedPublicCode: "signing_unavailable",
    simulated: true,
  },
  {
    id: "callback_unavailable",
    label: "Callback unavailable",
    description: "Approved return URL unreachable after verification.",
    expectedPublicCode: "callback_failed",
    simulated: true,
  },
  {
    id: "invalid_return_url",
    label: "Invalid return URL",
    description: "Hostile redirect input rejected before verification starts.",
    expectedPublicCode: "return_url_rejected",
    simulated: true,
  },
];

export function resolveLaunchpadTestScenario(id: string): LaunchpadTestScenario | null {
  return LAUNCHPAD_TEST_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
