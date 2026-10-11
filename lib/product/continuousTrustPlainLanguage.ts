// Build #519 — holder-safe explanation of receipt trust beyond signature alone.

import type { DecisionReceiptDisplayModel } from "@/lib/protocol/decisionReceiptDisplay";

export type ContinuousTrustFactor = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export function buildContinuousTrustFactors(model: DecisionReceiptDisplayModel): ContinuousTrustFactor[] {
  const signatureOk = model.signatureValid === true;
  const policyOk = model.visualStatus !== "invalid" || signatureOk;
  const evidenceCurrent =
    model.currentlyValid === true &&
    !["expired", "revoked", "invalid", "unknown"].includes(model.visualStatus);
  const notExpired = model.visualStatus !== "expired";
  const notRevoked = model.visualStatus !== "revoked";
  const scopeOk = model.actionPermitted !== false;

  return [
    {
      id: "signature",
      label: "Authentic signature",
      ok: signatureOk,
      detail: signatureOk
        ? "Cryptographic signature verified."
        : "Signature could not be verified — treat as untrusted.",
    },
    {
      id: "policy",
      label: "Valid policy binding",
      ok: policyOk && Boolean(model.policyId),
      detail: model.policyId
        ? `Bound to policy ${model.policyLabel ?? model.policyId}.`
        : "Policy binding is missing.",
    },
    {
      id: "evidence",
      label: "Current qualifying evidence",
      ok: evidenceCurrent,
      detail:
        model.currentlyValid === false
          ? "Underlying evidence no longer qualifies — refresh or re-verify may be required."
          : model.currentlyValid === true
            ? "Evidence still meets policy requirements at evaluation time."
            : "Current evidence status is unknown — fail closed for sensitive access.",
    },
    {
      id: "lifetime",
      label: "Not expired",
      ok: notExpired,
      detail: notExpired
        ? model.validUntil
          ? `Valid until ${model.validUntil}.`
          : "Within the receipt lifetime window."
        : "This receipt has expired.",
    },
    {
      id: "revocation",
      label: "Not revoked",
      ok: notRevoked,
      detail: notRevoked ? "No revocation recorded." : "This receipt was revoked.",
    },
    {
      id: "scope",
      label: "Correct partner and action scope",
      ok: scopeOk,
      detail: scopeOk
        ? "This receipt matches the requested partner action."
        : "This receipt cannot be used for the requested action.",
    },
  ];
}

export function summarizeContinuousTrust(model: DecisionReceiptDisplayModel): string {
  const factors = buildContinuousTrustFactors(model);
  const failed = factors.filter((f) => !f.ok);
  if (model.visualStatus === "verified" || model.visualStatus === "sandbox") {
    return "A valid signature alone is not enough — Abraxas also checks policy binding, evidence freshness, expiry, and revocation before reuse.";
  }
  if (failed.length === 0) return "This confirmation cannot be treated as currently valid.";
  return failed.map((f) => f.detail).join(" ");
}
