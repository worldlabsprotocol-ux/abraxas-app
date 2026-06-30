// FILE: lib/passport/verify.ts
// Pure verification logic — portable to Anchor, Move, and API handlers.

import nacl from "tweetnacl";
import { hasRequiredStamps } from "./stamps";
import { passportSigningMessage, serializePassportRoot } from "./serialize";
import {
  PROOF_TYPE_ED25519,
  PROOF_TYPE_ZK_LOGIN,
  type VerifyPassportParams,
  type VerifyPassportResult,
} from "./types";

export function verifyPassport(params: VerifyPassportParams): VerifyPassportResult {
  const { passport, requiredStamps, currentTimestamp, proof } = params;

  if (passport.version !== 1) {
    return { valid: false, reason: "unsupported passport version" };
  }
  if (passport.revoked) {
    return { valid: false, reason: "passport revoked" };
  }
  if (passport.expiresAt !== 0 && currentTimestamp >= passport.expiresAt) {
    return { valid: false, reason: "passport expired" };
  }
  if (!hasRequiredStamps(passport.stamps, requiredStamps)) {
    return { valid: false, reason: "missing required stamps" };
  }

  if (proof.proofType === PROOF_TYPE_ED25519) {
    if (proof.signer.length !== 32 || proof.signature.length !== 64) {
      return { valid: false, reason: "invalid Ed25519 proof shape" };
    }
    if (!bytesEqual(proof.signer, passport.authority)) {
      return { valid: false, reason: "signer does not match passport authority" };
    }
    const serialized = serializePassportRoot(passport);
    const message = passportSigningMessage(serialized);
    const ok = nacl.sign.detached.verify(message, proof.signature, proof.signer);
    return ok ? { valid: true } : { valid: false, reason: "invalid signature" };
  }

  if (proof.proofType === PROOF_TYPE_ZK_LOGIN) {
    // Type 1: validated by Sui proving service + Move module (not yet live in app)
    if (!proof.zkProof.length) {
      return { valid: false, reason: "empty ZK proof" };
    }
    return { valid: false, reason: "ZK login proof verification not enabled yet" };
  }

  return { valid: false, reason: "unknown proof type" };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
