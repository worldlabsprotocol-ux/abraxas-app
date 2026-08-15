// FILE: lib/admin/adminNav.ts
// Canonical admin navigation registry for the unified admin shell (UI only).

export type AdminNavSection = "protocol" | "operations" | "legacy";

export interface AdminNavItem {
  id: string;
  href: string;
  label: string;
  description: string;
  section: AdminNavSection;
}

/** Protocol console routes shown in the Phase 3b sidebar. */
export const ADMIN_PROTOCOL_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    id: "identity",
    href: "/admin/identity",
    label: "Identity",
    description: "Review verification submissions and credentials",
    section: "protocol",
  },
  {
    id: "partners",
    href: "/admin/partners",
    label: "Partners",
    description: "Partner onboarding, API keys, and webhooks",
    section: "protocol",
  },
  {
    id: "partner-flow",
    href: "/admin/partner-flow",
    label: "Partner Flow",
    description: "Partner Flow health and operational signals",
    section: "protocol",
  },
  {
    id: "receipts",
    href: "/admin/receipts",
    label: "Receipts",
    description: "Decision receipt inspector and revocation",
    section: "protocol",
  },
  {
    id: "trust",
    href: "/admin/trust",
    label: "Trust",
    description: "Issuers, credentials, and trust-layer inspection",
    section: "protocol",
  },
  {
    id: "privacy",
    href: "/admin/privacy",
    label: "Privacy",
    description: "Holder privacy export and deletion requests",
    section: "protocol",
  },
  {
    id: "connect",
    href: "/admin/connect",
    label: "Connect",
    description: "Connect authorization request inspector",
    section: "protocol",
  },
] as const;

/** Legacy verification center — reachable directly, not in the initial sidebar. */
export const ADMIN_LEGACY_VERIFICATION_CENTER: AdminNavItem = {
  id: "verification-center",
  href: "/admin",
  label: "Verification center",
  description: "Legacy asset verification operations",
  section: "legacy",
};

export function getAdminProtocolNavItems(): readonly AdminNavItem[] {
  return ADMIN_PROTOCOL_NAV_ITEMS;
}

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (href === "/admin") return normalized === "/admin";
  return normalized === href || normalized.startsWith(`${href}/`);
}

export function resolveActiveAdminNavItem(pathname: string): AdminNavItem | null {
  const match = ADMIN_PROTOCOL_NAV_ITEMS.find(item => isAdminNavItemActive(pathname, item.href));
  return match ?? null;
}

export function adminNavItemIds(): string[] {
  return ADMIN_PROTOCOL_NAV_ITEMS.map(item => item.id);
}
