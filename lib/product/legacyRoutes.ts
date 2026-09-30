// FILE: lib/product/legacyRoutes.ts
// Classification and copy for legacy public routes.

export type LegacyRouteClass =
  | "current_product"
  | "advanced_legacy"
  | "conflicting_obsolete"
  | "dead_redirect";

export interface LegacyRouteEntry {
  path: string;
  class: LegacyRouteClass;
  summary: string;
}

export const LEGACY_ROUTE_CATALOG: LegacyRouteEntry[] = [
  { path: "/", class: "current_product", summary: "Verification-first home" },
  { path: "/passport", class: "current_product", summary: "Holder Passport hub" },
  { path: "/verification", class: "current_product", summary: "Verification gateway" },
  { path: "/verify", class: "current_product", summary: "Receipt and record verifier" },
  { path: "/partner/continue", class: "current_product", summary: "Partner-initiated holder journey" },
  { path: "/developers/integration-studio", class: "current_product", summary: "Partner integration builder" },
  { path: "/developers/launchpad", class: "current_product", summary: "Partner Launchpad workspace" },
  { path: "/marketplace", class: "conflicting_obsolete", summary: "Legacy RWA vault directory" },
  { path: "/build", class: "conflicting_obsolete", summary: "Legacy tokenization intake (collides with nav Build)" },
  { path: "/onboard", class: "conflicting_obsolete", summary: "Legacy asset picker with broken deposit chain" },
  { path: "/vault/[id]", class: "advanced_legacy", summary: "Legacy vault detail pages" },
  { path: "/rwa", class: "advanced_legacy", summary: "Living market stress demo" },
  { path: "/swap", class: "advanced_legacy", summary: "HeroSwap embed demo" },
  { path: "/dashboard", class: "advanced_legacy", summary: "Honest transition to Passport" },
  { path: "/vault", class: "dead_redirect", summary: "Redirects home" },
  { path: "/terminal", class: "dead_redirect", summary: "Redirects home" },
  { path: "/deposit/[vaultId]", class: "dead_redirect", summary: "Redirects home (breaks onboard)" },
  { path: "/tokenize", class: "dead_redirect", summary: "Redirects to /build" },
  { path: "/identity", class: "dead_redirect", summary: "Redirects to /passport" },
];

export const LEGACY_TRANSITION_EYEBROW = "Legacy surface";

export const LEGACY_MARKETPLACE_COPY = {
  title: "Vault marketplace is a legacy demo",
  body: "Abraxas is reusable private eligibility infrastructure. The vault marketplace reflects an earlier tokenization narrative and is not the primary product path.",
  primaryLabel: "Open Passport",
  primaryHref: "/passport",
  secondaryLabel: "Build an integration",
  secondaryHref: "/developers/integration-studio",
  archiveLabel: "View legacy vault directory",
} as const;

export const LEGACY_BUILD_COPY = {
  title: "Asset tokenization intake is legacy",
  body: "Partners integrate eligibility policies through Integration Studio and Launchpad. This tokenization intake page remains for design-partner archives only.",
  primaryLabel: "Open Integration Studio",
  primaryHref: "/developers/integration-studio",
  secondaryLabel: "Partner Launchpad",
  secondaryHref: "/developers/launchpad",
  archiveLabel: "View legacy tokenization intake",
} as const;

export const LEGACY_ONBOARD_COPY = {
  title: "This onboarding flow is no longer active",
  body: "The asset deposit path was retired. Use Passport for holder verification or Integration Studio to connect an application.",
  primaryLabel: "Open Passport",
  primaryHref: "/passport",
  secondaryLabel: "Build an integration",
  secondaryHref: "/developers/integration-studio",
} as const;
