#!/usr/bin/env npx tsx
/**
 * Narrates the integrator journey (Build #821). Steps 1–3 require Abraxas issuance services;
 * steps 4–7 run entirely in the relying application with @abraxas/independent-verifier.
 */
import { build821SyntheticFixtureSet } from "./syntheticFixtureFactory";
import {
  BUILD_821_PARTNER_ID,
  BUILD_821_POLICY_ID,
  BUILD_821_ENVIRONMENT,
} from "./syntheticFixtureFactory";
import { integrationFailureSummary, permitScopedAction, verifyPortableDecision } from "./relyingParty";

const steps = [
  "1. Application requests a narrow policy-bound verification (hosted handoff or PartnerKit).",
  "2. Holder authorizes the specific request in their wallet.",
  "3. Abraxas evaluates evidence and returns a scoped signed decision receipt (+ status channel).",
  "4. Application loads pinned trust anchor (out-of-band security review).",
  "5. Application verifies receipt signature, SIAS, and signed status with standalone verifier.",
  "6. Application enforces audience, expiry, revocation, and policy scope.",
  "7. Application permits or denies the protected action; stores minimumStatusVersion when applicable.",
];

async function main() {
  console.log(JSON.stringify({ journey: steps, mode: "synthetic_sandbox_demo" }, null, 2));

  const set = build821SyntheticFixtureSet();
  const happy = verifyPortableDecision({
    record: set.decision_receipt,
    pinnedTrustAnchor: set.trust_anchor_bundle,
    signedIssuerAuthority: set.issuer_authority_statement,
    signedStatusStatement: set.signed_status_statement,
    relyingParty: {
      partner_id: BUILD_821_PARTNER_ID,
      policy_id: BUILD_821_POLICY_ID,
      environment: BUILD_821_ENVIRONMENT,
    },
    statementObservedAt: "2026-06-01T12:00:05.000Z",
  });

  const wrongAudience = verifyPortableDecision({
    record: set.decision_receipt,
    pinnedTrustAnchor: set.trust_anchor_bundle,
    signedIssuerAuthority: set.issuer_authority_statement,
    signedStatusStatement: set.signed_status_statement,
    relyingParty: {
      partner_id: "wrong-partner",
      policy_id: BUILD_821_POLICY_ID,
      environment: BUILD_821_ENVIRONMENT,
    },
  });

  console.log(
    JSON.stringify(
      {
        verify_happy_path: {
          permit: permitScopedAction(happy),
          failure_summary: integrationFailureSummary(happy),
        },
        verify_wrong_audience: {
          permit: permitScopedAction(wrongAudience),
          failure_summary: integrationFailureSummary(wrongAudience),
        },
        issuer_side_required_for_steps_1_to_3: [
          "Abraxas hosted partner flow or sovereign issuance API",
          "Wallet holder authorization",
          "Authoritative status signer for fresh signed status statements",
        ],
        verifier_side_runs_entirely_in_partner_app: [
          "@abraxas/independent-verifier",
          "Pinned trust anchor bundle",
          "SIAS + signed status artifacts delivered out-of-band or via partner-controlled cache",
        ],
      },
      null,
      2,
    ),
  );

  process.exitCode = permitScopedAction(happy) ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
