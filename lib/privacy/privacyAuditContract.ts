// FILE: lib/privacy/privacyAuditContract.ts
// Privacy audit metadata contract — no PII in persisted metadata.

export const PRIVACY_AUDIT_METADATA_KEYS = [
  "request_type",
  "from_status",
  "to_status",
  "reason_code",
  "changed_by_category",
  "admin_actor_category",
  "idempotency_key",
  "access_revoked",
  "purge_pending",
  "outcome",
] as const;

export const PRIVACY_PII_FORBIDDEN_METADATA_KEYS = [
  "email",
  "wallet",
  "sui_address",
  "wallet_address",
  "subject_sui",
  "storage_path",
  "document",
  "selfie",
  "biometric",
  "jwt",
  "credential_jwt",
  "oauth",
  "access_token",
  "admin_note",
  "reviewer_note",
  "legal_name",
] as const;

export function privacyAuditMetadataHasNoPii(metadata: Record<string, unknown>): boolean {
  const text = JSON.stringify(metadata).toLowerCase();
  if (text.includes("@")) return false;
  if (text.includes("0x")) return false;

  for (const key of PRIVACY_PII_FORBIDDEN_METADATA_KEYS) {
    if (text.includes(key)) return false;
  }
  return true;
}

export function buildPrivacyAuditMetadata(input: {
  requestType: string;
  fromStatus: string | null;
  toStatus: string;
  reasonCode: string;
  changedByCategory: string;
  adminActorCategory?: string | null;
  idempotencyKey?: string | null;
  accessRevoked?: boolean;
  purgePending?: boolean;
  outcome: string;
}): Record<string, unknown> {
  return {
    request_type: input.requestType,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    reason_code: input.reasonCode,
    changed_by_category: input.changedByCategory,
    admin_actor_category: input.adminActorCategory ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    access_revoked: input.accessRevoked ?? false,
    purge_pending: input.purgePending ?? false,
    outcome: input.outcome,
  };
}
