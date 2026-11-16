// FILE: app/api/developers/verification-first/verify-bundle/route.test.ts

import { describe, expect, it } from "vitest";
import {
  verificationFirstHostedLearningVerifyInputs,
  verificationFirstSyntheticPortableBundle,
} from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification";

describe("verification-first verify-bundle (hosted paste)", () => {
  it("matches demo valid when teaching bundle includes signed issuer authority", () => {
    const bundle = verificationFirstSyntheticPortableBundle();
    const anchor = bundle.bundled_trust_anchor!;
    const verification = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: anchor,
      partnerId: bundle.decision_receipt.partner_id,
      policyId: bundle.decision_receipt.policy_id,
      ...verificationFirstHostedLearningVerifyInputs(bundle),
    });
    expect(verification.currently_acceptable).toBe("yes");
    expect(verification.issuer_currently_authorized).toBe(true);
    expect(verification.failure_codes).toEqual([]);
  });

  it("fails issuer authorization without authority checkpoint (regression)", () => {
    const bundle = verificationFirstSyntheticPortableBundle();
    const anchor = bundle.bundled_trust_anchor!;
    const verification = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: anchor,
      partnerId: bundle.decision_receipt.partner_id,
      policyId: bundle.decision_receipt.policy_id,
    });
    expect(verification.currently_acceptable).toBe("no");
    expect(verification.failure_codes).toContain("authority_checkpoint_required");
  });
});