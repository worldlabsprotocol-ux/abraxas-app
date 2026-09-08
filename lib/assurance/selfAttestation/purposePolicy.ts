// FILE: lib/assurance/selfAttestation/purposePolicy.ts
// Self-attestation purpose restrictions — browse only.

import {
  ALLOWED_SELF_ATTESTATION_PURPOSES,
  BLOCKED_SELF_ATTESTATION_PURPOSES,
  type SelfAttestationPurpose,
} from "./constants";

export function normalizeSelfAttestationPurpose(raw: unknown): SelfAttestationPurpose | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (ALLOWED_SELF_ATTESTATION_PURPOSES.includes(value as SelfAttestationPurpose)) {
    return value as SelfAttestationPurpose;
  }
  return null;
}

export function isBlockedSelfAttestationPurpose(raw: unknown): boolean {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return BLOCKED_SELF_ATTESTATION_PURPOSES.includes(value as typeof BLOCKED_SELF_ATTESTATION_PURPOSES[number]);
}
