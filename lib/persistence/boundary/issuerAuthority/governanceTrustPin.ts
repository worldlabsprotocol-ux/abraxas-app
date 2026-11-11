// Established governance public key.
// The registry writer reads this pin. A caller argument, an issuer environment
// variable, and a second call cannot select a different governance identity.
// The private key is not accepted and is not stored.

import { publicEd25519JwkFingerprint } from "@abraxas/independent-verifier";
import {
  assertIndependentGovernancePin,
  verifyGovernanceSuccession,
  type GovernanceSuccessionAuthorization,
  type IndependentGovernancePin,
} from "./governanceApproval";

type AuthorityPublicKey = { key_id: string; public_jwk: JsonWebKey; status?: string };

type EstablishedSlot = {
  pin: IndependentGovernancePin;
  fingerprint: string;
  changeTicket: string;
  distrusted: { reason: string } | null;
};

const establishedPins = new Map<"demo" | "production", EstablishedSlot>();

export function readEstablishedGovernancePin(environment: "demo" | "production"):
  | { ok: true; pin: IndependentGovernancePin; fingerprint: string; changeTicket: string }
  | { ok: false; reason: "governance_pin_not_established" | "governance_pin_unavailable" } {
  const slot = establishedPins.get(environment);
  if (!slot) return { ok: false, reason: "governance_pin_not_established" };
  if (slot.distrusted) return { ok: false, reason: "governance_pin_unavailable" };
  return { ok: true, pin: slot.pin, fingerprint: slot.fingerprint, changeTicket: slot.changeTicket };
}

/** Operator installation of the first public pin. This does not read issuer configuration. */
export function establishGovernanceTrustPin(input: {
  environment: "demo" | "production";
  pin: IndependentGovernancePin;
  changeTicket: string;
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: AuthorityPublicKey[];
  statusSigners: AuthorityPublicKey[];
}): { ok: true; fingerprint: string } | {
  ok: false;
  reason: "governance_pin_change_ticket_required" | "governance_pin_already_established" | "governance_pin_invalid" | "governance_pin_not_independent";
} {
  const changeTicket = input.changeTicket.trim();
  if (!changeTicket) return { ok: false, reason: "governance_pin_change_ticket_required" };
  if (establishedPins.has(input.environment)) {
    return { ok: false, reason: "governance_pin_already_established" };
  }
  const independent = assertIndependentGovernancePin({
    pin: input.pin,
    anchorKeyId: input.anchorKeyId,
    anchorPublicJwk: input.anchorPublicJwk,
    authorityKeys: input.authorityKeys,
    statusSigners: input.statusSigners,
  });
  if (!independent.ok) return independent;
  const fingerprint = publicEd25519JwkFingerprint(input.pin.publicJwk);
  if (!fingerprint) return { ok: false, reason: "governance_pin_invalid" };
  establishedPins.set(input.environment, {
    pin: { keyId: input.pin.keyId, publicJwk: input.pin.publicJwk },
    fingerprint,
    changeTicket,
    distrusted: null,
  });
  return { ok: true, fingerprint };
}

/** Replaces the public pin only when the current governance key signed the succession. */
export function rotateEstablishedGovernancePin(input: {
  environment: "demo" | "production";
  succession: GovernanceSuccessionAuthorization;
  signatureBase64Url: string;
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: AuthorityPublicKey[];
  statusSigners: AuthorityPublicKey[];
}): { ok: true; fingerprint: string } | { ok: false; reason: string } {
  const current = readEstablishedGovernancePin(input.environment);
  if (!current.ok) return current;
  const verified = verifyGovernanceSuccession({
    succession: input.succession,
    signatureBase64Url: input.signatureBase64Url,
    currentPin: current.pin,
    anchorKeyId: input.anchorKeyId,
    anchorPublicJwk: input.anchorPublicJwk,
    authorityKeys: input.authorityKeys,
    statusSigners: input.statusSigners,
  });
  if (!verified.ok) return verified;
  const fingerprint = publicEd25519JwkFingerprint(verified.successor.publicJwk);
  if (!fingerprint) return { ok: false, reason: "governance_pin_invalid" };
  const slot = establishedPins.get(input.environment);
  if (!slot || slot.fingerprint !== current.fingerprint) {
    return { ok: false, reason: "governance_pin_unavailable" };
  }
  establishedPins.set(input.environment, {
    pin: verified.successor,
    fingerprint,
    changeTicket: slot.changeTicket,
    distrusted: null,
  });
  return { ok: true, fingerprint };
}

/**
 * Marks the established fingerprint unusable. Does not install a replacement.
 * Authority changes then fail closed until the same governance key is available
 * again outside this process. This function is not part of receipt issuance.
 */
export function distrustEstablishedGovernancePin(input: {
  environment: "demo" | "production";
  fingerprint: string;
  reason: string;
}): { ok: true } | { ok: false; reason: "governance_pin_not_established" | "governance_pin_fingerprint_mismatch" | "governance_pin_unavailable" } {
  const slot = establishedPins.get(input.environment);
  if (!slot) return { ok: false, reason: "governance_pin_not_established" };
  if (slot.distrusted) return { ok: false, reason: "governance_pin_unavailable" };
  if (slot.fingerprint !== input.fingerprint || !input.reason.trim()) {
    return { ok: false, reason: "governance_pin_fingerprint_mismatch" };
  }
  slot.distrusted = { reason: input.reason.trim() };
  return { ok: true };
}
