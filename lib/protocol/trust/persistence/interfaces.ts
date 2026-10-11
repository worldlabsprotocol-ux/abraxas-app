// Storage-neutral persistence ports — adapters wrap existing Supabase/Postgres paths.

export type ReplayNonceReservationInput = {
  partnerId: string;
  applicationId: string;
  receiptId: string;
  subjectScopeHash: string;
  policyId: string;
  policyVersion: number;
  actionScopeNorm: string;
  nonceHash: string;
  expiresAt: string;
};

export type ReplayNonceReservationResult =
  | { ok: true; code: "reserved" }
  | { ok: false; code: string };

export interface ReplayNonceStore {
  reserveConsumeNonce(input: ReplayNonceReservationInput): Promise<ReplayNonceReservationResult>;
}

export interface ReceiptValidityStore {
  getReceiptById(receiptId: string): Promise<Record<string, unknown> | null>;
}

export interface RevocationStore {
  isReceiptRevoked(receiptId: string): Promise<boolean>;
}

export interface PolicyRegistrySnapshotStore {
  getPolicyCommitmentHash(policyId: string, policyVersion: number): Promise<string | null>;
}

export type AuditEventInput = {
  actor_type: string;
  actor_id?: string | null;
  action: string;
  object_type?: string | null;
  object_id?: string | null;
  policy_id?: string | null;
  policy_version?: number | null;
  metadata?: Record<string, unknown>;
};

export interface AuditEventStore {
  append(event: AuditEventInput): Promise<string | null>;
}
