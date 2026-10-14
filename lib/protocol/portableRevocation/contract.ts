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
  /** SHA-256 of prior snapshot canonical payload; null for genesis. */
  previous_snapshot_hash: string | null;
  status_entries: PortableRevocationStatusEntry[];
};

export type PortableRevocationSignedArtifact = {
  media_type: typeof PORTABLE_REVOCATION_MEDIA_TYPE;
  payload: PortableRevocationPayload;
  payload_hash: string;
  signature: string;
};
