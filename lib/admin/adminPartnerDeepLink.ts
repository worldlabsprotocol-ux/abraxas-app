// FILE: lib/admin/adminPartnerDeepLink.ts
// Shared admin partners deep-link tab allowlist and untrusted partner_id query parsing.

export const ADMIN_PARTNERS_TABS = [
  "onboarding",
  "keys",
  "usage",
  "webhooks",
  "observability",
  "sandbox-receipts",
] as const;

export type AdminPartnersTab = (typeof ADMIN_PARTNERS_TABS)[number];

export const ADMIN_PARTNER_ID_MAX_LENGTH = 128;

const PARTNER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

const TAB_SET = new Set<string>(ADMIN_PARTNERS_TABS);

export function resolveAdminPartnersTab(value: string | null): AdminPartnersTab {
  if (value && TAB_SET.has(value)) {
    return value as AdminPartnersTab;
  }
  return "onboarding";
}

/** Parse untrusted partner_id query input — invalid values are ignored (never logged). */
export function parseAdminPartnerIdQuery(raw: string | null | undefined): string | undefined {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return undefined;
  if (trimmed.length > ADMIN_PARTNER_ID_MAX_LENGTH) return undefined;
  if (!PARTNER_ID_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function buildAdminPartnersHref(input: {
  tab: AdminPartnersTab;
  partnerId?: string;
}): string {
  const params = new URLSearchParams();
  params.set("tab", input.tab);
  const partnerId = input.partnerId ? parseAdminPartnerIdQuery(input.partnerId) : undefined;
  if (partnerId) {
    params.set("partner_id", partnerId);
  }
  return `/admin/partners?${params.toString()}`;
}
