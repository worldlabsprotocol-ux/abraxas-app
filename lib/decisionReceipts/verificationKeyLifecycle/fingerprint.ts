// FILE: lib/decisionReceipts/verificationKeyLifecycle/fingerprint.ts

import { createHash } from "crypto";
import type { ReceiptVerificationPublicJwk } from "./contract";

export function publicReceiptJwkFingerprint(jwk: ReceiptVerificationPublicJwk): string {
  return createHash("sha256")
    .update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x }))
    .digest("hex");
}

export function toPublicReceiptJwk(jwk: JsonWebKey | null | undefined): ReceiptVerificationPublicJwk | null {
  if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || !jwk.x) {
    return null;
  }
  if (typeof (jwk as { d?: unknown }).d === "string") {
    return { kty: "OKP", crv: "Ed25519", x: jwk.x };
  }
  return { kty: "OKP", crv: "Ed25519", x: jwk.x };
}
