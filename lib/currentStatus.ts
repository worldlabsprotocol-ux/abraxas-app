// FILE: lib/currentStatus.ts
// Confident production status — lead with what's live, then final gates.

export const PRODUCTION_STATUS_LEAD =
  "Core verification and Passport issuance are live in production with real assets and pilot partners.";

export const PRODUCTION_STATUS_GATES =
  "We're completing the final gates for full open mainnet — Sui mainnet Passport deployment, automated asset monitoring, and external relying party transactions.";

export const PRODUCTION_STATUS_HEADLINE =
  "Abraxas verification and Passport are already used in production with real assets and partners. We're finalizing the remaining gates for full open, self-serve mainnet.";

export const INTEGRATE_STATUS_LINE = PRODUCTION_STATUS_HEADLINE;

export type StatusItemState = "live" | "in_progress";

export interface CurrentStatusItem {
  id: string;
  label: string;
  detail: string;
  state: StatusItemState;
  href?: string;
}

export const CURRENT_STATUS_LIVE: CurrentStatusItem[] = [
  {
    id: "passport",
    label: "Passport + core verification",
    detail: "Issuance, Veriff IDV, W3C credentials, verify API — production",
    state: "live",
    href: "/passport",
  },
  {
    id: "proof",
    label: "Live reference assets",
    detail: "Cielo Sunrise, land deals, on-registry proof",
    state: "live",
    href: "/terminal#assets",
  },
];

export const CURRENT_STATUS_REMAINING: CurrentStatusItem[] = [
  {
    id: "monitoring",
    label: "Automated asset monitoring",
    detail: "State-change signals → refresh or revoke",
    state: "in_progress",
    href: "/trust-framework#trust-over-time",
  },
  {
    id: "sui-mainnet",
    label: "Sui Passport on mainnet",
    detail: "On-chain deployment after security audit",
    state: "in_progress",
    href: "/roadmap",
  },
  {
    id: "external-rp",
    label: "External relying party proof",
    detail: "First unaffiliated production transaction",
    state: "in_progress",
    href: "/partners",
  },
  {
    id: "audits",
    label: "Published security audits",
    detail: "Credential API review + Move Passport audit",
    state: "in_progress",
    href: "/security",
  },
];
