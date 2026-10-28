// FILE: lib/design/footerLinks.ts
// Minimal institutional footer — essentials only; product routes remain in primary nav.

export const FOOTER_PRIMARY_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
] as const;

export const FOOTER_COMPANY_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/worldlabsprotocol",
    external: true,
  },
] as const;

export const FOOTER_LEGAL_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
] as const;

/** @deprecated Use FOOTER_PRIMARY_LINKS — kept for legacy imports during migration. */
export const FOOTER_PRODUCT_LINKS = FOOTER_PRIMARY_LINKS;

/** @deprecated Use FOOTER_PRIMARY_LINKS */
export const FOOTER_DEVELOPER_LINKS = [{ label: "Documentation", href: "/docs" }] as const;
