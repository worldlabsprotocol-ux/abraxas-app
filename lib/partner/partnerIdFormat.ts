// FILE: lib/partner/partnerIdFormat.ts
// Client-safe partner_id format validation shared by admin UI and server lifecycle code.

export const PARTNER_ID_MAX_LENGTH = 128;

const PARTNER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

export function isValidPartnerId(partnerId: string): boolean {
  const trimmed = partnerId.trim();
  if (!trimmed || trimmed.length > PARTNER_ID_MAX_LENGTH) return false;
  return PARTNER_ID_PATTERN.test(trimmed);
}

export function normalizePartnerId(partnerId: string): string {
  return partnerId.trim();
}
