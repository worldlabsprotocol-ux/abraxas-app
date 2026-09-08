// FILE: lib/assurance/selfAttestation/constants.ts
// Tier 1 self-attestation constants — L0 browse only.

export const SELF_ATTESTATION_CLAIM_TYPE = "self_attested_age_band" as const;
export const SELF_ATTESTATION_PROVENANCE = "user_self_attestation" as const;
export const SELF_ATTESTATION_ASSURANCE = "L0" as const;
export const SELF_ATTESTATION_ISSUER = "issuer:abraxas-self-attest" as const;

export type SelfAttestedAgeBand = "over_21" | "under_21";
export type SelfAttestationPurpose = "browse";

export const ALLOWED_SELF_ATTESTATION_PURPOSES: readonly SelfAttestationPurpose[] = ["browse"];

export const BLOCKED_SELF_ATTESTATION_PURPOSES = [
  "checkout",
  "purchase",
  "delivery",
  "account_recovery",
  "regulated",
] as const;

export const BROWSE_RECEIPT_ARTIFACT_TYPE = "browse_access_receipt" as const;

export const DEFAULT_SELF_ATTESTED_AGE_TTL_HOURS = 24;
export const MIN_SELF_ATTESTED_AGE_TTL_HOURS = 1;
export const MAX_SELF_ATTESTED_AGE_TTL_HOURS = 72;

export function resolveSelfAttestedAgeTtlHours(): number {
  const raw = process.env.SELF_ATTESTED_AGE_TTL_HOURS?.trim();
  if (!raw) return DEFAULT_SELF_ATTESTED_AGE_TTL_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_SELF_ATTESTED_AGE_TTL_HOURS;
  return Math.min(MAX_SELF_ATTESTED_AGE_TTL_HOURS, Math.max(MIN_SELF_ATTESTED_AGE_TTL_HOURS, Math.floor(n)));
}
