// FILE: lib/account/accountNavItems.ts
// Profile menu destinations for the unified account hub.

import { HOLDER_VERIFY_DEFAULT_PATH } from "@/lib/integrate/partnerJourney";

export type AccountNavItem = {
  label: string;
  href: string;
  description: string;
  /** When true, only show for signed-in holder (wallet / Abraxas session). */
  requiresHolderSession?: boolean;
};

export const ACCOUNT_NAV_PRIMARY: readonly AccountNavItem[] = [
  { label: "Account", href: "/account", description: "Use cases and status" },
  { label: "Passport", href: "/passport", description: "Proofs and verification", requiresHolderSession: true },
  { label: "Applications", href: "/account/applications", description: "Launchpad and sandbox apps" },
  { label: "Organizations", href: "/account/organizations", description: "Eligibility and partner programs" },
  { label: "Credentials", href: "/account/credentials", description: "Records, JWT, and exports", requiresHolderSession: true },
  { label: "Settings", href: "/account/settings", description: "Sessions and sign-out" },
] as const;

export const ACCOUNT_NAV_SECONDARY: readonly AccountNavItem[] = [
  { label: "My records & credentials", href: HOLDER_VERIFY_DEFAULT_PATH, description: "Registry lookup shortcut", requiresHolderSession: true },
  { label: "Tokenize an asset", href: "/build", description: "Owner intake", requiresHolderSession: true },
] as const;

export function filterAccountNavItems(
  items: readonly AccountNavItem[],
  options: { holderSignedIn: boolean },
): AccountNavItem[] {
  return items.filter((item) => !item.requiresHolderSession || options.holderSignedIn);
}
