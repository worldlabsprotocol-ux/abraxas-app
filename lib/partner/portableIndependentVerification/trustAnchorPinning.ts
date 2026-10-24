// FILE: lib/partner/portableIndependentVerification/trustAnchorPinning.ts
// Bundled anchors are informational until matched to an integrator-established pin.

import type { TrustAnchorBundleV1 } from "@abraxas/independent-verifier";

export function trustAnchorBundlesEquivalent(
  a: TrustAnchorBundleV1,
  b: TrustAnchorBundleV1,
): boolean {
  return (
    a.anchor_key_id === b.anchor_key_id
    && a.public_key_fingerprint === b.public_key_fingerprint
    && a.environment === b.environment
  );
}

export function assertBundledAnchorMatchesIntegratorPin(input: {
  bundled: TrustAnchorBundleV1;
  integratorPinned: TrustAnchorBundleV1;
}): { ok: true } | { ok: false; reason: "bundled_trust_anchor_not_authenticated" } {
  if (!trustAnchorBundlesEquivalent(input.bundled, input.integratorPinned)) {
    return { ok: false, reason: "bundled_trust_anchor_not_authenticated" };
  }
  return { ok: true };
}
