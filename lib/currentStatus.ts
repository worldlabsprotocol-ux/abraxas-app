// FILE: lib/currentStatus.ts
// Honest current state — confident founder voice, shared across homepage and integrate.

/** Homepage strip — 3–4 lines max, not a status report. */
export const HOMEPAGE_STATUS_LEAD =
  "Core verification and Passport issuance are live in production — real assets, real pilot partners.";

export const HOMEPAGE_STATUS_ROLLOUT =
  "We're in a staged rollout toward full open mainnet: Sui mainnet Passport, published audits, first external relying party transactions, and automated asset monitoring.";

export const HOMEPAGE_STATUS_PROOF =
  "Cielo Sunrise and land deals are live proof — not a demo.";

/** Balanced external framing — progress + gates, not apologetic. */
export const CONFIDENT_STATUS_FRAMING =
  "Core verification and Passport issuance are live in production with real assets and pilot partners. We're deliberately taking a staged approach to full open mainnet — the remaining gates are Sui mainnet Passport deployment, published audits, first external relying party transactions, and automated asset state monitoring.";

export const INTEGRATE_PRODUCTION_NOTE =
  "Abraxas is already used in production with real assets — Cielo Sunrise, Chickasaw land, and CPG workflows. Design partners integrate today; full open self-serve mainnet follows audits, mainnet Passport, and asset monitoring v1.";

export type StatusItemState = "live" | "in_progress" | "planned";

export interface CurrentStatusItem {
  id: string;
  label: string;
  detail: string;
  state: StatusItemState;
  href?: string;
}

/** Top 4 remaining items — simple language for partners. */
export const CURRENT_STATUS_IN_PROGRESS: CurrentStatusItem[] = [
  {
    id: "asset-monitoring",
    label: "Automated asset monitoring",
    detail: "Detect sale, lien, or appraisal drift → refresh or revoke",
    state: "in_progress",
    href: "/trust-framework#trust-over-time",
  },
  {
    id: "sui-mainnet",
    label: "Sui Passport on mainnet",
    detail: "On-chain stamps move from devnet after audit",
    state: "in_progress",
    href: "/roadmap#mainnet-readiness",
  },
  {
    id: "external-rp",
    label: "External relying party proof",
    detail: "First unaffiliated org clears a real production transaction",
    state: "in_progress",
    href: "/integrations/relying-parties",
  },
  {
    id: "audits",
    label: "Published security audits",
    detail: "Credential API review + Move Passport mainnet audit",
    state: "in_progress",
    href: "/security",
  },
];

export const CURRENT_STATUS_LIVE: CurrentStatusItem[] = [
  {
    id: "passport-live",
    label: "Passport + verification",
    detail: "zkLogin, Veriff, W3C credentials, verify API — in production",
    state: "live",
    href: "/passport",
  },
  {
    id: "pilot-proof",
    label: "Live reference assets",
    detail: "Cielo STR booking, land portal, on-registry proof",
    state: "live",
    href: "/case-studies/cielo",
  },
];

export const DEEP_DIVE_LINKS = [
  { label: "How trust stays current", href: "/trust-framework#trust-over-time" },
  { label: "Mainnet gates", href: "/roadmap#mainnet-readiness" },
  { label: "Relying party program", href: "/integrations/relying-parties" },
] as const;

export const STATUS_STATE_LABEL: Record<StatusItemState, string> = {
  live: "Live",
  in_progress: "In progress",
  planned: "Planned",
};

export const STATUS_STATE_COLOR: Record<StatusItemState, string> = {
  live: "#10B981",
  in_progress: "#F59E0B",
  planned: "#3B82F6",
};
