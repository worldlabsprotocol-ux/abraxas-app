// FILE: lib/partner/portableIndependentVerification/plainVerificationSummary.ts

import type { IndependentVerificationResult } from "@abraxas/independent-verifier";
import { verificationFirstDemoManifest } from "./integrationFirstDemonstration";

export type PlainVerificationVerdict =
  | "Valid"
  | "Not valid"
  | "Wrong audience"
  | "Revoked"
  | "Needs fresh status";

export type HostedVerificationMode = "hosted_demo_fixture" | "hosted_pasted_bundle";

export const VERIFICATION_FIRST_DEMO_PLAIN = {
  policySummary:
    "Checks whether the receipt meets the selected age requirement when it was signed.",
  partnerSummary: "Shows who the receipt was intended for.",
  demoDisclaimer:
    "Synthetic demo only — this does not prove a real person's age or identity.",
} as const;

export const HOSTED_TRUST_BOUNDARY_COPY: Record<HostedVerificationMode, string> = {
  hosted_demo_fixture:
    "You are viewing a hosted teaching check on a fixed demo receipt. This is not full offline independent verification.",
  hosted_pasted_bundle:
    "This hosted check used the trust anchor inside your pasted bundle. That is not independent authentication — production teams pin trust material out-of-band and run @abraxas/independent-verifier on their own systems.",
};

export const OFFLINE_INDEPENDENT_VERIFICATION_NOTE =
  "Full independent verification means running @abraxas/independent-verifier offline with a trust anchor you established outside the bundle.";

export function plainVerificationVerdict(
  verification: IndependentVerificationResult,
  scenario?: string,
): PlainVerificationVerdict {
  if (scenario === "wrong_audience") return "Wrong audience";
  if (scenario === "revoked") return "Revoked";
  if (scenario === "tampered_signature" || scenario === "invalid_signature") return "Not valid";
  if (scenario === "stale_status") return "Needs fresh status";
  const stale = verification.failure_codes.some(
    (c) => c.includes("stale") || c.includes("freshness") || c.includes("expired"),
  );
  if (stale) return "Needs fresh status";
  if (verification.currently_acceptable === "yes") return "Valid";
  const revoked =
    verification.failure_codes.some((c) => c.includes("revok")) ||
    verification.phases.some((p) => p.detail.toLowerCase().includes("revok"));
  if (revoked) return "Revoked";
  const audience = verification.failure_codes.some(
    (c) => c.includes("audience") || c.includes("partner") || c.includes("policy"),
  );
  if (audience) return "Wrong audience";
  if (!verification.cryptographically_authentic) return "Not valid";
  return "Not valid";
}

function phaseFailed(verification: IndependentVerificationResult, idFragment: string): boolean {
  return verification.phases.some(
    (p) => p.id.includes(idFragment) && p.status === "fail",
  );
}

export function plainIntegrityLine(verification: IndependentVerificationResult): string {
  if (verification.cryptographically_authentic) {
    return "The receipt signature and binding checks passed — nothing obvious was changed.";
  }
  if (phaseFailed(verification, "integrator_trust_anchor")) {
    return "Trust anchor mismatch — the bundle’s anchor was not independently pinned.";
  }
  return "The receipt did not pass integrity checks — treat it as untrusted.";
}

export function plainAudienceLine(
  verification: IndependentVerificationResult,
  scenario?: string,
): string {
  if (scenario === "wrong_audience") {
    return "This receipt was not issued for the partner and policy you are checking.";
  }
  if (verification.policy_and_audience_match) {
    return "The receipt matches the partner and policy this check used.";
  }
  return "The receipt may not match the partner or policy you intended.";
}

export function plainFreshnessLine(verification: IndependentVerificationResult): string {
  if (phaseFailed(verification, "freshness") || phaseFailed(verification, "status")) {
    return "The signed status evidence is missing, too old, or not acceptable for this check.";
  }
  if (verification.status_evidence_authentic) {
    return "The signed status snapshot we used looks current enough for this teaching check.";
  }
  return "We could not confirm that the status evidence is fresh enough.";
}

export function plainReplayLine(verification: IndependentVerificationResult): string {
  const replayPhase = verification.phases.find((p) => p.id.includes("replay"));
  if (!replayPhase) {
    return "Single-use replay rules were not evaluated in this teaching check.";
  }
  if (replayPhase.status === "pass") {
    return "This receipt does not appear to have been reused.";
  }
  if (replayPhase.status === "fail") {
    return "This receipt may have already been used — do not accept it again.";
  }
  return "Replay could not be determined from the evidence provided.";
}

export function plainIssuerLine(verification: IndependentVerificationResult): string {
  if (verification.issuer_currently_authorized) {
    return "The issuer was authorized under the trust material used for this check.";
  }
  return "The issuer is not authorized under the trust material used for this check.";
}

export function plainWhatItProvesHuman(input: {
  isSyntheticDemo: boolean;
  decisionResult?: string;
}): string {
  if (input.isSyntheticDemo) {
    return `${VERIFICATION_FIRST_DEMO_PLAIN.policySummary} ${VERIFICATION_FIRST_DEMO_PLAIN.demoDisclaimer}`;
  }
  const decision =
    input.decisionResult === "approved"
      ? "passed"
      : input.decisionResult === "denied"
        ? "did not pass"
        : "recorded an outcome for";
  return `This receipt says a policy check ${decision} at the time it was signed. Confirm the policy meaning in your own integration docs.`;
}

export function plainAcceptabilityLine(verification: IndependentVerificationResult): string {
  if (verification.currently_acceptable === "yes") {
    return "Based on this evidence, you could allow the protected action if your rules still accept this status snapshot.";
  }
  if (verification.currently_acceptable === "no") {
    return "Do not allow the action — integrity, audience, status, or freshness checks failed.";
  }
  return "We could not decide acceptability from this evidence alone.";
}

export function plainNextAction(input: {
  verdict: PlainVerificationVerdict;
  mode: HostedVerificationMode;
  scenario?: string;
}): string {
  if (input.verdict === "Valid") {
    return "If this matches your policy, you may permit the action. For production, re-check with offline verification and fresh signed status.";
  }
  if (input.verdict === "Wrong audience") {
    return "Do not permit access. Request a receipt bound to your partner and policy.";
  }
  if (input.verdict === "Revoked") {
    return "Do not permit access. The status shows revocation even if the signature still verifies.";
  }
  if (input.verdict === "Needs fresh status") {
    return "Do not permit access yet. Ask the issuer for an updated signed status snapshot.";
  }
  if (input.scenario === "tampered_signature" || input.scenario === "invalid_signature") {
    return "Do not trust this receipt. Obtain a fresh bundle from a trusted channel.";
  }
  return "Do not permit access. Review advanced details or verify offline with your pinned trust anchor.";
}

export function technicalIdentifierBlock(input: {
  policy_id: string;
  partner_id: string;
  receipt_id?: string;
}): string {
  const lines = [
    `Policy ID: ${input.policy_id}`,
    `Partner ID: ${input.partner_id}`,
  ];
  if (input.receipt_id) lines.push(`Receipt ID: ${input.receipt_id}`);
  return lines.join("\n");
}

export function buildDefaultResultRows(input: {
  verification: IndependentVerificationResult;
  mode: HostedVerificationMode;
  scenario?: string;
  policy_id: string;
  partner_id: string;
  receipt_id?: string;
  isSyntheticDemo?: boolean;
  decisionResult?: string;
}): {
  verdict: PlainVerificationVerdict;
  trustBoundary: string;
  rows: Array<{ label: string; value: string }>;
  next: string;
  technicalIds: string;
} {
  const verdict = plainVerificationVerdict(input.verification, input.scenario);
  const isDemo = input.isSyntheticDemo === true;
  const rows: Array<{ label: string; value: string }> = [
    {
      label: "What it proves",
      value: plainWhatItProvesHuman({
        isSyntheticDemo: isDemo,
        decisionResult: input.decisionResult,
      }),
    },
    {
      label: "Who it was intended for",
      value: isDemo
        ? VERIFICATION_FIRST_DEMO_PLAIN.partnerSummary
        : "The partner named in your integration configuration.",
    },
    {
      label: "Issuer authorized",
      value: plainIssuerLine(input.verification),
    },
    {
      label: "Receipt unchanged",
      value: plainIntegrityLine(input.verification),
    },
    {
      label: "Status evidence fresh enough",
      value: plainFreshnessLine(input.verification),
    },
    {
      label: "Single-use (replay)",
      value: plainReplayLine(input.verification),
    },
    {
      label: "Currently acceptable",
      value: plainAcceptabilityLine(input.verification),
    },
  ];
  return {
    verdict,
    trustBoundary: HOSTED_TRUST_BOUNDARY_COPY[input.mode],
    rows,
    next: plainNextAction({ verdict, mode: input.mode, scenario: input.scenario }),
    technicalIds: technicalIdentifierBlock({
      policy_id: input.policy_id,
      partner_id: input.partner_id,
      receipt_id: input.receipt_id,
    }),
  };
}
