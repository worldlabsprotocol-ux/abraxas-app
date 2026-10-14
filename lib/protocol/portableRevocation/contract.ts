// FILE: lib/protocol/portableRevocation/contract.ts
// Chain-neutral portable revocation snapshot (Build #564).

export const PORTABLE_REVOCATION_BUILD = 564 as const;

export const PORTABLE_REVOCATION_MEDIA_TYPE =
  "application/vnd.abraxas.portable-revocation-snapshot+json" as const;

export const PORTABLE_REVOCATION_SCHEMA_VERSION = "1.0.0" as const;

/** Registry schema_versions slot shared with decision receipt keys. */
export const PORTABLE_REVOCATION_KEY_SCHEMA = "1.0.0" as const;

export type PortableRevocationStatusEntry = {
  /** SHA-256(issuer_id + receipt_id) — no holder pseudonym or wallet in feed. */
  status_id: string;
  state: "active" | "revoked";
  updated_at: string;
};

export type PortableRevocationPayload = {
  schema_version: typeof PORTABLE_REVOCATION_SCHEMA_VERSION;
  issuer_id: string;
  signing_key_id: string;
  snapshot_sequence: number;
  issued_at: string;
  expires_at: string;
  max_freshness_seconds: number;
  /** Upper bound on age of each status_entries[].updated_at at verification time. */
  max_status_entry_age_seconds: number;
  /** SHA-256 of prior snapshot canonical payload; null for genesis. */
  previous_snapshot_hash: string | null;
  status_entries: PortableRevocationStatusEntry[];
};

/** RP-local high-water mark for a trusted revocation feed (no Abraxas API). */
export type PortableRevocationCheckpoint = {
  revocation_issuer_id: string;
  highest_sequence: number;
  last_payload_hash: string;
  updated_at: string;
};

/** Out-of-band first trust — pins an exact signed snapshot; never implicit genesis. */
export type PortableRevocationBootstrapTrust = {
  revocation_issuer_id: string;
  snapshot_sequence: number;
  trusted_payload_hash: string;
  snapshot_signing_key_id: string;
};

export type PortableRevocationSignedArtifact = {
  media_type: typeof PORTABLE_REVOCATION_MEDIA_TYPE;
  payload: PortableRevocationPayload;
  payload_hash: string;
  signature: string;
};
