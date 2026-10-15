// Simulated receipt verification states for homepage / protocol visuals (not live verify API).

export type ReceiptScenario = "valid" | "expired" | "revoked" | "unavailable";

export const RECEIPT_DEMO_POLICY_ID = "policy_age21_retail_v3";
export const RECEIPT_DEMO_ISSUER = "abraxas-trust-registry";

/** Institutional check outcome for simulated verifier UI — not production verify API. */
export type ReceiptDemoCheckStatus = "PASS" | "FAIL" | "UNKNOWN";

export type ReceiptDemoCheckId =
  | "issuer_authority"
  | "signature_integrity"
  | "policy_binding"
  | "audience_binding"
  | "expiration"
  | "freshness"
  | "revocation"
  | "replay_protection";

export type ReceiptDemoCheck = {
  id: ReceiptDemoCheckId;
  label: string;
  detail: string;
  status: ReceiptDemoCheckStatus;
};

export type ReceiptDemoState = {
  /** PASS only — never FAIL on unavailable (use checks for UNKNOWN). */
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
  authenticityChecks: ReceiptDemoCheck[];
  authorizationChecks: ReceiptDemoCheck[];
};

function check(
  id: ReceiptDemoCheckId,
  label: string,
  detail: string,
  status: ReceiptDemoCheckStatus,
): ReceiptDemoCheck {
  return { id, label, detail, status };
}

function authenticityChecksFor(scenario: ReceiptScenario): ReceiptDemoCheck[] {
  if (scenario === "unavailable") {
    return [
      check(
        "issuer_authority",
        "Issuer authority",
        "Cannot evaluate without verifier reachability.",
        "UNKNOWN",
      ),
      check(
        "signature_integrity",
        "Signature integrity",
        "Signature not evaluated. Verifier unreachable (simulated).",
        "UNKNOWN",
      ),
      check(
        "policy_binding",
        "Policy binding",
        "Policy binding not evaluated offline.",
        "UNKNOWN",
      ),
      check(
        "audience_binding",
        "Audience binding",
        "Audience binding not evaluated offline.",
        "UNKNOWN",
      ),
    ];
  }

  const passDetail = {
    issuer: "Issuer is recognized and trusted.",
    signature: "Cryptographic signature verifies.",
    policy: "Receipt is bound to an active policy.",
    audience: "Intended audience matches the request.",
  };

  return [
    check("issuer_authority", "Issuer authority", passDetail.issuer, "PASS"),
    check("signature_integrity", "Signature integrity", passDetail.signature, "PASS"),
    check("policy_binding", "Policy binding", passDetail.policy, "PASS"),
    check("audience_binding", "Audience binding", passDetail.audience, "PASS"),
  ];
}

function authorizationChecksFor(scenario: ReceiptScenario): ReceiptDemoCheck[] {
  if (scenario === "unavailable") {
    return [
      check("expiration", "Expiration", "Authorization window not evaluated.", "UNKNOWN"),
      check("freshness", "Freshness", "Freshness not evaluated.", "UNKNOWN"),
      check("revocation", "Revocation", "Revocation status not evaluated.", "UNKNOWN"),
      check("replay_protection", "Replay protection", "Replay state not evaluated.", "UNKNOWN"),
    ];
  }

  if (scenario === "valid") {
    return [
      check("expiration", "Expiration", "Decision has not expired.", "PASS"),
      check("freshness", "Freshness", "Within acceptable time window.", "PASS"),
      check("revocation", "Revocation", "Not revoked by issuer.", "PASS"),
      check("replay_protection", "Replay protection", "Not a replayed receipt.", "PASS"),
    ];
  }

  if (scenario === "expired") {
    return [
      check("expiration", "Expiration", "Decision expired. Deny despite valid signature.", "FAIL"),
      check("freshness", "Freshness", "Outside acceptable time window.", "FAIL"),
      check("revocation", "Revocation", "No revocation signal (simulated).", "PASS"),
      check("replay_protection", "Replay protection", "Not a replayed receipt.", "PASS"),
    ];
  }

  // revoked
  return [
    check("expiration", "Expiration", "Decision has not expired.", "PASS"),
    check("freshness", "Freshness", "Within acceptable time window.", "PASS"),
    check("revocation", "Revocation", "Issuer revoked authorization.", "FAIL"),
    check("replay_protection", "Replay protection", "Not a replayed receipt.", "PASS"),
  ];
}

function statusIsPass(status: ReceiptDemoCheckStatus): boolean {
  return status === "PASS";
}

export function deriveReceiptDemoState(scenario: ReceiptScenario): ReceiptDemoState {
  const authenticityChecks = authenticityChecksFor(scenario);
  const authorizationChecks = authorizationChecksFor(scenario);

  const signatureStatus =
    authenticityChecks.find((c) => c.id === "signature_integrity")?.status ?? "UNKNOWN";
  const signatureValid = signatureStatus === "PASS";

  const validityWindowOk = statusIsPass(
    authorizationChecks.find((c) => c.id === "expiration")?.status ?? "UNKNOWN",
  );
  const freshnessOk = statusIsPass(
    authorizationChecks.find((c) => c.id === "freshness")?.status ?? "UNKNOWN",
  );
  const revocationClear = statusIsPass(
    authorizationChecks.find((c) => c.id === "revocation")?.status ?? "UNKNOWN",
  );
  const replayProtected = statusIsPass(
    authorizationChecks.find((c) => c.id === "replay_protection")?.status ?? "UNKNOWN",
  );

  const verifierReachable = scenario !== "unavailable";
  const issuerTrusted = statusIsPass(
    authenticityChecks.find((c) => c.id === "issuer_authority")?.status ?? "UNKNOWN",
  );
  const policyBound = statusIsPass(
    authenticityChecks.find((c) => c.id === "policy_binding")?.status ?? "UNKNOWN",
  );
  const audienceBound = statusIsPass(
    authenticityChecks.find((c) => c.id === "audience_binding")?.status ?? "UNKNOWN",
  );

  const currentlyAuthorized = scenario === "valid";
  const outcome = scenario === "valid" ? "PERMIT" : "DENY";

  const verificationSummary =
    scenario === "valid"
      ? "All cryptographic and authorization checks pass (simulated)."
      : scenario === "expired"
        ? "Cryptographic authenticity passes. Authorization denied because the decision expired (simulated)."
        : scenario === "revoked"
          ? "Cryptographic authenticity and freshness pass. Authorization denied because of issuer revocation (simulated)."
          : "Verifier unreachable. Checks cannot be evaluated; no invalid signature is implied (simulated).";

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
    authenticityChecks,
    authorizationChecks,
  };
}

export type ReceiptDemoField = { label: string; value: string; mono?: boolean };

export function buildReceiptDemoFields(
  scenario: ReceiptScenario,
  state: ReceiptDemoState,
): ReceiptDemoField[] {
  const sigCheck = state.authenticityChecks.find((c) => c.id === "signature_integrity");
  const signatureValue =
    sigCheck?.status === "PASS"
      ? "Ed25519 · valid (simulated)"
      : sigCheck?.status === "UNKNOWN"
        ? "Not evaluated · verifier unreachable (simulated)"
        : "Ed25519 · failed (simulated)";

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
            : scenario === "revoked"
              ? "2026-11-01T00:00:00Z"
              : "None",
      mono: true,
    },
    { label: "policy_id", value: RECEIPT_DEMO_POLICY_ID, mono: true },
    { label: "audience", value: "app:financial", mono: true },
    { label: "signature", value: signatureValue, mono: true },
  ];
}

/** Maps demo check status to inspector row (hero protocol demo). */
export function receiptDemoCheckToInspectorStatus(
  status: ReceiptDemoCheckStatus,
): "pass" | "fail" | "unknown" {
  if (status === "PASS") return "pass";
  if (status === "FAIL") return "fail";
  return "unknown";
}
