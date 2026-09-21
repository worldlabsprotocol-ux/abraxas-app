// FILE: lib/home/commandCenter.ts
// Homepage command-center contract. Card hrefs must exist on the public route manifest.

import { PUBLIC_PRODUCT_ROUTES } from "@/lib/product/publicRouteManifest";
import { NETWORK_CAPABILITY_REGISTRY } from "@/lib/partner/networkCapability/registry";
import {
  PUBLIC_FLOW_STATUS_LABEL,
  publicHomeFlowById,
  type PublicFlowStatus,
} from "@/lib/product/publicFlowManifest";

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
  status: PublicFlowStatus;
  statusLabel: string;
  actionLabel: string;
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
  availability: PublicFlowStatus;
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

function cardFromFlow(
  id: string,
  group: CommandAudience,
): CommandCapabilityCard {
  const flow = publicHomeFlowById(id);
  if (!flow) throw new Error(`missing public home flow: ${id}`);
  return {
    id,
    group,
    title: flow.title,
    summary: flow.summary,
    href: flow.route,
    status: flow.status,
    statusLabel: PUBLIC_FLOW_STATUS_LABEL[flow.status],
    actionLabel: flow.actionLabel,
  };
}

export const COMMAND_CENTER_CARDS: readonly CommandCapabilityCard[] = [
  cardFromFlow("passport", "people"),
  cardFromFlow("verify-result", "people"),
  cardFromFlow("reusable", "people"),
  cardFromFlow("partner-flow", "partners"),
  cardFromFlow("studio", "partners"),
  cardFromFlow("launchpad", "partners"),
  cardFromFlow("docs", "partners"),
  cardFromFlow("policy-packs", "protocol"),
  cardFromFlow("trading", "protocol"),
  cardFromFlow("payment", "protocol"),
  cardFromFlow("multichain", "protocol"),
];

export const COMMAND_CENTER_GROUPS: ReadonlyArray<{ id: CommandAudience; title: string; intro: string }> = [
  { id: "people", title: "For people", intro: "Prove eligibility once and reuse it with consent." },
  { id: "partners", title: "For partners", intro: "Request a current result and verify it on your server." },
  { id: "protocol", title: "Protocol capabilities", intro: "Policy, adapters, and readiness. Not a trading or payments app." },
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
    body: "The partner receives a receipt bound to their request, not a reusable public secret.",
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

export const COMMAND_CENTER_USE_CASES: readonly CommandUseCase[] = [
  {
    id: "membership",
    title: "Private membership and access",
    summary: "Prove member eligibility without handing over documents.",
    href: "/good-trouble",
    availability: "sandbox",
    availabilityLabel: "Sandbox",
  },
  {
    id: "trading",
    title: "Trading venue access",
    summary: "Partner-preflight eligibility for market access. Abraxas never places an order.",
    href: "/examples/trading-venue",
    availability: "sandbox",
    availabilityLabel: networkStatus("hyperliquid_trading_venue") === "configured"
      ? "Sandbox preflight"
      : "Planned",
  },
  {
    id: "payment",
    title: "Payment and commerce authorization",
    summary: "Authorize a checkout decision from a current result. Abraxas does not process USDC or complete bookings.",
    href: "/examples/payment-authorization",
    availability: "sandbox",
    availabilityLabel: "Sandbox preflight · no USDC movement",
  },
  {
    id: "protocol-access",
    title: "Protocol and token-gated access",
    summary: "Eligibility for named protocol, member, or redemption access. The partner keeps execution.",
    href: "/docs/portable-action-contract",
    availability: "sandbox",
    availabilityLabel: "Sandbox · Mainnet planned",
  },
  {
    id: "reuse",
    title: "Reusable verification across partner requests",
    summary: "Use one private verification again with fresh consent for compatible requests.",
    href: "/docs/reusable-eligibility",
    availability: "available",
    availabilityLabel: "Available",
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

export const COMMAND_CENTER_FAKE_CLAIM = /TVL|users online|live trades|live USDC|USDC booking|\$[0-9]|judge demo|Judge Demo/i;
export const COMMAND_CENTER_EXECUTION_CLAIM = /executes trades|places an order|processes USDC|completes bookings|submits a transfer/i;
