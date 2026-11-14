// FILE: lib/partner/portableIndependentVerification/integrationFirstDemonstration.ts
// Non-production adoption demo — Build #821 synthetic fixtures, zero Abraxas account.

import type {
  DecisionReceiptRecord,
  IndependentVerificationResult,
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
  TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { authorityCheckpointFromStatement, verifyAbraxasReceiptIndependently } from "@abraxas/independent-verifier";
import manifest from "../../../examples/integration-first-relying-party/fixtures/manifest.json";
import decisionReceipt from "../../../examples/integration-first-relying-party/fixtures/decision-receipt.json";
import trustAnchorBundle from "../../../examples/integration-first-relying-party/fixtures/trust-anchor-bundle.json";
import issuerAuthorityStatement from "../../../examples/integration-first-relying-party/fixtures/issuer-authority-statement.json";
import signedStatusStatement from "../../../examples/integration-first-relying-party/fixtures/signed-status-statement.json";
import signedStatusStatementRevoked from "../../../examples/integration-first-relying-party/fixtures/signed-status-statement-revoked.json";

export const VERIFICATION_FIRST_DEMO_SCENARIOS = ["valid", "wrong_audience", "revoked"] as const;
export type VerificationFirstDemoScenario = (typeof VERIFICATION_FIRST_DEMO_SCENARIOS)[number];

export type VerificationFirstDemoManifest = typeof manifest;

const OBSERVED_AT_VALID = "2026-06-01T12:00:05.000Z";

const RECEIPT = decisionReceipt as DecisionReceiptRecord;
const PINNED_ANCHOR = trustAnchorBundle as TrustAnchorBundleV1;
const SIAS = issuerAuthorityStatement as SignedIssuerAuthorityStatement;

export function verificationFirstDemoManifest(): VerificationFirstDemoManifest {
  return manifest;
}

export function verificationFirstDemoBundleDownloadHints(): {
  repo_relative_dir: string;
  artifacts: string[];
  npm_package: string;
} {
  return {
    repo_relative_dir: "examples/integration-first-relying-party/fixtures",
    artifacts: [
      "trust-anchor-bundle.json",
      "issuer-authority-statement.json",
      "decision-receipt.json",
      "signed-status-statement.json",
    ],
    npm_package: "@abraxas/independent-verifier",
  };
}

export function runVerificationFirstDemoScenario(
  scenario: VerificationFirstDemoScenario,
): {
  scenario: VerificationFirstDemoScenario;
  relying_party: { partner_id: string; policy_id: string; environment: "demo" | "production" };
  verification: IndependentVerificationResult;
  next_action: string;
} {
  const partnerId =
    scenario === "wrong_audience" ? "wrong-partner" : manifest.partner_id;
  const status: SignedReceiptStatusStatement =
    scenario === "revoked"
      ? (signedStatusStatementRevoked as SignedReceiptStatusStatement)
      : (signedStatusStatement as SignedReceiptStatusStatement);

  const verification = verifyAbraxasReceiptIndependently({
    record: RECEIPT,
    pinnedTrustAnchor: PINNED_ANCHOR,
    signedIssuerAuthority: SIAS,
    relyingParty: {
      partner_id: partnerId,
      policy_id: manifest.policy_id,
      environment: manifest.environment === "demo" ? "demo" : "production",
    },
    statementObservedAt: scenario === "valid" ? OBSERVED_AT_VALID : new Date().toISOString(),
    signedStatusStatement: status,
    ...(scenario === "valid" ? authorityCheckpointFromStatement(SIAS) : {}),
  });

  let next_action: string;
  if (scenario === "valid" && verification.currently_acceptable === "yes") {
    next_action =
      "You may permit the gated action for this partner and policy scope. Re-check signed status before high-risk actions; a snapshot does not guarantee indefinite validity.";
  } else if (scenario === "wrong_audience") {
    next_action = "Deny access. The receipt is not bound to your relying-party audience — do not trust partner_id or policy_id from the bundle alone.";
  } else if (scenario === "revoked") {
    next_action =
      "Deny access. Signed status shows revocation — cryptographic authenticity may still pass, but current acceptability must be no.";
  } else {
    next_action =
      "Deny or hold. Review failure_codes and signed status freshness; fetch a newer signed status statement from the issuer channel when policy requires live validity.";
  }

  return {
    scenario,
    relying_party: {
      partner_id: partnerId,
      policy_id: manifest.policy_id,
      environment: manifest.environment === "demo" ? "demo" : "production",
    },
    verification,
    next_action,
  };
}

export const VERIFICATION_FIRST_JOURNEY_STEPS = [
  {
    step: 1,
    title: "Obtain artifacts",
    body: "Your institution receives a portable bundle (receipt, issuer authority statement, signed status, and a trust anchor to pin out-of-band). Synthetic non-production fixtures ship in the Abraxas repo for onboarding.",
  },
  {
    step: 2,
    title: "Understand the decision",
    body: "The receipt proves a narrow policy-bound outcome at issuance time — partner, policy, environment, and signature — not raw identity data.",
  },
  {
    step: 3,
    title: "Verify independently",
    body: "Run @abraxas/independent-verifier in your backend. No Abraxas login, no Supabase, no call to this website at verify time.",
  },
  {
    step: 4,
    title: "Check authority and status",
    body: "Validate issuer authorization against the pinned anchor, then evaluate signed status for freshness, revocation, and audience match.",
  },
  {
    step: 5,
    title: "Enforce and act",
    body: "Permit the protected action only when currently_acceptable is yes for your scope. Otherwise deny with your application’s safe messaging.",
  },
] as const;