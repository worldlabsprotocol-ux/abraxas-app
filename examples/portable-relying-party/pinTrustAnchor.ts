/**
 * Copy into your service — bundled anchors from Abraxas are informational until matched to your pin.
 */
import type { TrustAnchorBundleV1 } from "../../packages/abraxas-independent-verifier/src/index";

export function assertBundledAnchorMatchesPin(input: {
  bundled: TrustAnchorBundleV1;
  integratorPinned: TrustAnchorBundleV1;
}): { ok: true } | { ok: false; reason: "bundled_trust_anchor_not_authenticated" } {
  const { bundled, integratorPinned } = input;
  if (
    bundled.anchor_key_id !== integratorPinned.anchor_key_id
    || bundled.public_key_fingerprint !== integratorPinned.public_key_fingerprint
    || bundled.environment !== integratorPinned.environment
  ) {
    return { ok: false, reason: "bundled_trust_anchor_not_authenticated" };
  }
  return { ok: true };
}
