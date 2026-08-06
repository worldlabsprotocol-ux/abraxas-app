// FILE: lib/admin/adminIdentityNav.ts
// Admin identity-review navigation copy and visibility helpers (no auth logic).

export const ADMIN_IDENTITY_REVIEW_HREF = "/admin/identity" as const;

export const ADMIN_IDENTITY_NAV = {
  sectionLabel: "Admin",
  label: "Identity review",
  href: ADMIN_IDENTITY_REVIEW_HREF,
  description: "Review pending verification submissions",
  backToPassportLabel: "Back to Passport",
  backToPassportHref: "/passport",
} as const;

/** Admin navigation is visible only when existing admin access rules authorize the session. */
export function shouldShowAdminIdentityNav(isAdmin: boolean): boolean {
  return isAdmin;
}

/** Pending count is fetched only for authorized admins — never for other users. */
export function shouldFetchAdminIdentityPendingCount(isAdmin: boolean): boolean {
  return isAdmin;
}

export function formatAdminIdentityPendingBadge(
  pendingCount: number | null | undefined,
  isAdmin: boolean,
): string | null {
  if (!shouldFetchAdminIdentityPendingCount(isAdmin)) return null;
  if (pendingCount == null || pendingCount < 1) return null;
  return String(pendingCount);
}

export function adminIdentityPendingAriaLabel(pendingCount: number | null | undefined): string | null {
  if (pendingCount == null || pendingCount < 1) return null;
  return `${pendingCount} pending verification submission${pendingCount === 1 ? "" : "s"}`;
}
