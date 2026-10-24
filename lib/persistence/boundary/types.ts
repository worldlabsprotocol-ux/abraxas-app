// FILE: lib/persistence/boundary/types.ts
// Bounded operational persistence — transport replaceable; crypto authority stays outside Postgres.

/** Who holds write authority for operational rows in this process. */
export type PersistenceAuthorityRole =
  | "production_legacy"
  | "sovereign_staging"
  | "shadow_observer";

export type ShadowPersistenceMode = "off" | "compare";

/** Minimal receipt provenance for shadow parity (no holder PII). */
export type ReceiptProvenanceSnapshot = {
  receiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  payloadHash: string;
  signature: string;
  signingKeyId: string;
  storedStatus: string;
  expiresAt: string | null;
  revokedAt: string | null;
  signatureValid: boolean;
  resolvedLifecycleStatus: "active" | "expired" | "revoked" | "invalidated";
};

export type MeteringAttributionSnapshot = {
  idempotencyKey: string;
  partnerId: string;
  eventType: string;
  receiptId: string | null;
  present: boolean;
};

export type VerticalSliceParityMismatch = {
  field: string;
  legacy: string;
  sovereign: string;
  invariant: string;
};

export type VerticalSliceParityReport = {
  ok: boolean;
  receipt: { compared: boolean; mismatches: VerticalSliceParityMismatch[] };
  metering: { compared: boolean; mismatches: VerticalSliceParityMismatch[] };
  notes: string[];
};
