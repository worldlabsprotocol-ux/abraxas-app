// FILE: lib/design/footerLinks.ts
// Canonical footer link groups — docs reachable without primary nav.

export const FOOTER_PRODUCT_LINKS = [
  { label: "Passport", href: "/passport" },
  { label: "Capability map", href: "/#capability-map" },
  { label: "For businesses", href: "/integrate" },
  { label: "Pilot journey", href: "/pilot-journey" },
] as const;

export const FOOTER_DEVELOPER_LINKS = [
  { label: "Documentation", href: "/docs" },
  { label: "Integration Studio", href: "/developers/integration-studio" },
  { label: "Partner Flow", href: "/docs/partner-flow" },
  { label: "Receipt verification", href: "/verify?mode=receipt" },
  { label: "Solana integration", href: "/docs/solana" },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Apply", href: "/integrations#apply" },
] as const;
