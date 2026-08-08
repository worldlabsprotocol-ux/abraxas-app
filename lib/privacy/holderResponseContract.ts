// FILE: lib/privacy/holderResponseContract.ts
// Holder-facing privacy API/UI must expose status and dates only.

export const HOLDER_PRIVACY_FORBIDDEN_RESPONSE_KEYS = [
  "id",
  "request_ref",
  "subject_sui",
  "subject_pseudonym_id",
  "subject_id",
  "wallet",
  "wallet_address",
  "sui_address",
  "email",
  "oauth_sub",
  "storage_path",
  "document_id",
  "admin_note",
  "reviewer_note",
  "reason_code",
  "idempotency_key",
  "credential_jwt",
  "jwt",
] as const;

export const HOLDER_PRIVACY_ALLOWED_REQUEST_KEYS = [
  "request_type",
  "status",
  "status_label",
  "created_at",
  "updated_at",
] as const;

export function holderPrivacyRequestHasOnlyAllowedFields(
  request: Record<string, unknown>,
): boolean {
  const keys = Object.keys(request);
  if (keys.length === 0) return false;
  return keys.every(key =>
    (HOLDER_PRIVACY_ALLOWED_REQUEST_KEYS as readonly string[]).includes(key));
}

export function holderPrivacyPayloadHasNoForbiddenFields(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  if (text.includes("@")) return false;
  if (text.includes("0x")) return false;
  if (text.includes("storage_path")) return false;
  if (text.includes("oauth")) return false;

  if (!payload || typeof payload !== "object") return true;

  const walk = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.every(walk);
    if (!value || typeof value !== "object") return true;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if ((HOLDER_PRIVACY_FORBIDDEN_RESPONSE_KEYS as readonly string[]).includes(
        key as (typeof HOLDER_PRIVACY_FORBIDDEN_RESPONSE_KEYS)[number],
      )) {
        return false;
      }
      if (!walk(nested)) return false;
    }
    return true;
  };

  return walk(payload);
}
