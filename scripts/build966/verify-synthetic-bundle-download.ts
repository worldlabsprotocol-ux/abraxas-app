// FILE: scripts/build966/verify-synthetic-bundle-download.ts
// Validates synthetic bundle download shape (teaching labels + portable schema).

import { verificationFirstSyntheticPortableBundle } from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier";
import { authorityCheckpointFromStatement } from "@abraxas/independent-verifier";

function main() {
  const bundle = verificationFirstSyntheticPortableBundle();
  if (!bundle.export_provenance.bundled_trust_anchor_informational_only) {
    throw new Error("bundle must mark anchor as informational");
  }
  const pin = bundle.bundled_trust_anchor;
  const verification = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: pin,
    partnerId: bundle.decision_receipt.partner_id,
    policyId: bundle.decision_receipt.policy_id,
    statementObservedAt: "2026-06-01T12:00:05.000Z",
    ...authorityCheckpointFromStatement(bundle.signed_issuer_authority),
  });
  if (verification.currently_acceptable !== "yes") {
    throw new Error(`expected teaching bundle valid with pinned anchor, got ${verification.currently_acceptable}`);
  }
  console.log("PASS: synthetic bundle complete, labeled, verifies with independently pinned anchor");
}

main();