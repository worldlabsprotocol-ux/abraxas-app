// Simulated receipt verification states for homepage / protocol visuals (not live verify API).

export type ReceiptScenario = "valid" | "expired" | "revoked" | "unavailable";

export const RECEIPT_DEMO_POLICY_ID = "policy_age21_retail_v3";
export const RECEIPT_DEMO_ISSUER = "abraxas-trust-registry";

export type ReceiptDemoState = {
  signatureValid: boolean;
  validityWindowOk: boolean;
  freshnessOk: boolean;
  revocationClear: boolean;
  replayProtected: boolean;
  verifierReachable: boolean;
  issuerTrusted: boolean;
  policyBound: boolean;
  audienceBound: boolean;
  currentlyAuthorized: boolean;
  outcome: "PERMIT" | "DENY";
  verificationSummary: string;
  aggregateStatus: "VALID" | "EXPIRED" | "REVOKED" | "UNAVAILABLE";
};

export function deriveReceiptDemoState(scenario: ReceiptScenario): ReceiptDemoState {
  const signatureValid = scenario !== "unavailable";
  const validityWindowOk = scenario === "valid";
  const freshnessOk = scenario === "valid";
  const revocationClear = scenario === "valid" || scenario === "expired";
  const replayProtected = scenario === "valid";
  const verifierReachable = scenario !== "unavailable";
  const issuerTrusted = scenario !== "unavailable";
  const policyBound = signatureValid;
  const audienceBound = signatureValid;
  const currentlyAuthorized = scenario === "valid";
  const outcome = scenario === "valid" ? "PERMIT" : "DENY";

  const verificationSummary =
    scenario === "valid"
      ? "All cryptographic and authorization checks pass (simulated)."
      : scenario === "expired"
        ? "Signature valid — decision expired (simulated)."
        : scenario === "revoked"
          ? "Signature valid — issuer revoked authorization (simulated)."
          : "Verifier unreachable — status unknown (simulated).";

  const aggregateStatus =
    scenario === "valid"
      ? "VALID"
      : scenario === "expired"
        ? "EXPIRED"
        : scenario === "revoked"
          ? "REVOKED"
          : "UNAVAILABLE";

  return {
    signatureValid,
    validityWindowOk,
    freshnessOk,
    revocationClear,
    replayProtected,
    verifierReachable,
    issuerTrusted,
    policyBound,
    audienceBound,
    currentlyAuthorized,
    outcome,
    verificationSummary,
    aggregateStatus,
  };
}

export type ReceiptDemoField = { label: string; value: string; mono?: boolean };

export function buildReceiptDemoFields(
  scenario: ReceiptScenario,
  state: ReceiptDemoState,
): ReceiptDemoField[] {
  return [
    { label: "type", value: "access_decision", mono: true },
    { label: "result", value: state.outcome.toLowerCase(), mono: true },
    { label: "subject", value: "did:example:8f3e…7a7c", mono: true },
    { label: "issuer", value: `did:abraxas:${RECEIPT_DEMO_ISSUER}`, mono: true },
    { label: "issued_at", value: "2025-03-08T14:20:16Z", mono: true },
    {
      label: "expires_at",
      value:
        scenario === "expired"
          ? "2024-01-01T00:00:00Z"
          : scenario === "valid"
            ? "2026-11-01T00:00:00Z"
            : "—",
      mono: true,
    },
    { label: "policy_id", value: RECEIPT_DEMO_POLICY_ID, mono: true },
    { label: "audience", value: "app:financial", mono: true },
    {
      label: "signature",
      value: state.signatureValid ? "Ed25519 · valid (simulated)" : "unavailable",
      mono: true,
    },
  ];
}
