// FILE: lib/home/commandCenter.ts
// Homepage command-center contract. Card hrefs must exist on the public route manifest.

import { PUBLIC_PRODUCT_ROUTES } from "@/lib/product/publicRouteManifest";
import { NETWORK_CAPABILITY_REGISTRY } from "@/lib/partner/networkCapability/registry";

export const COMMAND_CENTER_VERSION = "1.0.0" as const;

export const COMMAND_CENTER_HEADLINE = "Prove only what a service needs.";
export const COMMAND_CENTER_SUBHEAD =
  "Abraxas is a private eligibility protocol. Your evidence stays private. Partners verify a current result on their server.";
export const COMMAND_CENTER_TRUST =
  "Use one private verification again with fresh consent. Abraxas does not execute trades, payments, transfers, or transactions.";

export type CommandAudience = "people" | "partners" | "protocol";

export interface CommandPrimaryPath {
  id: string;
  label: string;
  href: string;
  audience: "person" | "partner" | "explorer";
  hint: string;
}

export interface CommandCapabilityCard {
  id: string;
  group: CommandAudience;
  title: string;
  summary: string;
  href: string;
}

export interface CommandProtocolStage {
  id: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export interface CommandUseCase {
  id: string;
  title: string;
  summary: string;
  href: string;
  availability: "available" | "planned";
  availabilityLabel: string;
}

function manifestPath(href: string): string {
  return href.split("?")[0] ?? href;
}

export function isPublicProductRoute(href: string): boolean {
  return (PUBLIC_PRODUCT_ROUTES as readonly string[]).includes(manifestPath(href));
}

export const COMMAND_CENTER_PRIMARY_PATHS: readonly CommandPrimaryPath[] = [
  {
    id: "prove",
    label: "Prove eligibility",
    href: "/passport",
    audience: "person",
    hint: "Open Passport and share only the result a service needs.",
  },
  {
    id: "verify",
    label: "Verify a result",
    href: "/verification",
    audience: "explorer",
    hint: "Check a partner-bound receipt on a public verifier.",
  },
  {
    id: "build",
    label: "Build with Abraxas",
    href: "/developers/integration-studio",
    audience: "partner",
    hint: "Assemble a partner integration from real packs and snippets.",
  },
];

export const COMMAND_CENTER_CARDS: readonly CommandCapabilityCard[] = [
  { id: "passport", group: "people", title: "Passport", summary: "Carry reusable eligibility and choose what a partner can see.", href: "/passport" },
  { id: "verify-result", group: "people", title: "Verify a result", summary: "Inspect a current, partner-bound receipt — not the underlying evidence.", href: "/verification" },
  { id: "reusable", group: "people", title: "Reusable eligibility", summary: "Use one private verification again, with fresh consent each time.", href: "/docs/reusable-eligibility" },
  { id: "partner-flow", group: "partners", title: "Partner Flow", summary: "Hosted request, consent, and server-side receipt verification.", href: "/docs/partner-flow" },
  { id: "studio", group: "partners", title: "Integration Studio", summary: "Guided packs, snippets, and starter-kit generation.", href: "/developers/integration-studio" },
  { id: "launchpad", group: "partners", title: "Partner Launchpad", summary: "Sandbox workspace and readiness path for partner apps.", href: "/developers/launchpad" },
  { id: "docs", group: "partners", title: "Developer docs", summary: "Partner Flow, adapters, and operator-safe protocol guides.", href: "/docs" },
  { id: "policy-packs", group: "protocol", title: "Policy packs", summary: "Pinned policies that ask only for the outcome a partner needs.", href: "/docs/policy-packs" },
  { id: "trading", group: "protocol", title: "Trading access", summary: "Eligibility preflight for venue access. Abraxas never places a trade.", href: "/docs/trading-venue" },
  { id: "payment", group: "protocol", title: "Payment authorization", summary: "Checkout eligibility preflight. Abraxas never moves funds.", href: "/docs/payment-authorization" },
  { id: "multichain", group: "protocol", title: "Multi-chain readiness", summary: "Accurate sandbox, testnet, and Mainnet posture — no silent activation.", href: "/docs/multichain-mainnet-readiness" },
];

export const COMMAND_CENTER_GROUPS: ReadonlyArray<{ id: CommandAudience; title: string; intro: string }> = [
  { id: "people", title: "For people", intro: "Prove eligibility once and reuse it with consent." },
  { id: "partners", title: "For partners", intro: "Request a current result and verify it on your server." },
  { id: "protocol", title: "Protocol capabilities", intro: "Policy, adapters, and readiness — not a trading or payments app." },
];

export const COMMAND_CENTER_PROTOCOL_STAGES: readonly CommandProtocolStage[] = [
  {
    id: "holder",
    title: "Holder",
    body: "A person opens Passport and prepares only the eligibility a partner asked for.",
    href: "/passport",
    linkLabel: "Open Passport",
  },
  {
    id: "result",
    title: "Private policy result",
    body: "The partner sees a current policy outcome. Evidence stays with the holder.",
    href: "/docs/selective-disclosure",
    linkLabel: "Selective disclosure",
  },
  {
    id: "consent",
    title: "Fresh consent",
    body: "Reuse is allowed only when the holder consents again for that request.",
    href: "/docs/reusable-eligibility",
    linkLabel: "Reusable eligibility",
  },
  {
    id: "receipt",
    title: "Partner-bound receipt",
    body: "The partner receives a receipt bound to their request — not a reusable public secret.",
    href: "/verification",
    linkLabel: "Verify a result",
  },
  {
    id: "action",
    title: "Server-verified protocol action",
    body: "The partner backend decides what to do next. Abraxas does not execute the action.",
    href: "/docs/portable-action-contract",
    linkLabel: "Partner action contract",
  },
];

function networkStatus(id: string) {
  return NETWORK_CAPABILITY_REGISTRY.find((entry) => entry.network_id === id)?.status ?? "planned";
}

function availabilityFromStatus(status: string): { availability: "available" | "planned"; availabilityLabel: string } {
  if (status === "configured" || status === "available") {
    return { availability: "available", availabilityLabel: "Available" };
  }
  if (status === "production_review_required") {
    return { availability: "planned", availabilityLabel: "Planned · Production review required" };
  }
  if (status === "disabled") {
    return { availability: "planned", availabilityLabel: "Planned · not enabled" };
  }
  return { availability: "planned", availabilityLabel: "Planned" };
}

export const COMMAND_CENTER_USE_CASES: readonly CommandUseCase[] = [
  {
    id: "membership",
    title: "Private membership and access",
    summary: "Prove member eligibility without handing over documents.",
    href: "/docs/reusable-eligibility",
    ...availabilityFromStatus("configured"),
  },
  {
    id: "trading",
    title: "Trading venue access",
    summary: "Partner-preflight eligibility for market access. Abraxas never places an order.",
    href: "/docs/trading-venue",
    ...availabilityFromStatus(networkStatus("hyperliquid_trading_venue")),
  },
  {
    id: "payment",
    title: "Payment and commerce authorization",
    summary: "Authorize a checkout decision from a current result. Abraxas never moves money.",
    href: "/docs/payment-authorization",
    availability: networkStatus("arc_circle_testnet") === "configured" ? "available" : "planned",
    availabilityLabel:
      networkStatus("arc_circle_mainnet") === "disabled"
        ? "Available on testnet · Mainnet planned"
        : "Available",
  },
  {
    id: "protocol-access",
    title: "Protocol and token-gated access",
    summary: "Eligibility for named protocol, member, or redemption access. The partner keeps execution.",
    href: "/docs/portable-action-contract",
    availability: networkStatus("evm_sandbox") === "configured" ? "available" : "planned",
    availabilityLabel:
      networkStatus("evm_mainnet") === "production_review_required"
        ? "Available in sandbox · Mainnet planned"
        : "Available",
  },
  {
    id: "reuse",
    title: "Reusable verification across partner requests",
    summary: "Use one private verification again with fresh consent for compatible requests.",
    href: "/docs/reusable-eligibility",
    ...availabilityFromStatus("configured"),
  },
];

export function commandCenterHrefErrors(): string[] {
  const hrefs = [
    ...COMMAND_CENTER_PRIMARY_PATHS.map((item) => item.href),
    ...COMMAND_CENTER_CARDS.map((item) => item.href),
    ...COMMAND_CENTER_PROTOCOL_STAGES.map((item) => item.href),
    ...COMMAND_CENTER_USE_CASES.map((item) => item.href),
  ];
  return hrefs.filter((href) => !isPublicProductRoute(href));
}

export const COMMAND_CENTER_FAKE_CLAIM = /TVL|users online|live trades|\$[0-9]|judge demo|Judge Demo/i;
export const COMMAND_CENTER_EXECUTION_CLAIM = /executes trades|places an order|moves funds|moves money|submits a transfer/i;
