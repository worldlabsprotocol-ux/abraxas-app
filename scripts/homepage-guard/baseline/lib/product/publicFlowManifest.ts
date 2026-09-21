// FILE: lib/product/publicFlowManifest.ts
// Homepage and public-nav flow contract. Status is visitor-usable truth, not marketing.

export const PUBLIC_FLOW_STATUSES = ["available", "sandbox", "planned"] as const;
export type PublicFlowStatus = (typeof PUBLIC_FLOW_STATUSES)[number];

export type PublicFlowAudience = "person" | "partner" | "explorer";

export interface PublicHomeFlow {
  id: string;
  title: string;
  route: string;
  status: PublicFlowStatus;
  audience: PublicFlowAudience;
  actionLabel: string;
  endState: string;
  summary: string;
}

export const PUBLIC_FLOW_STATUS_LABEL: Record<PublicFlowStatus, string> = {
  available: "Available",
  sandbox: "Sandbox",
  planned: "Planned",
};

export const PUBLIC_FLOW_FORBIDDEN_CLAIM =
  /live USDC payment|USDC booking|Try the live experience|LIVE INTEGRATION|users online|live trades|judge demo/i;

/** Every homepage card, featured example, and Protocol in Action item. */
export const PUBLIC_HOME_FLOWS: readonly PublicHomeFlow[] = [
  {
    id: "passport",
    title: "Passport",
    route: "/passport",
    status: "available",
    audience: "person",
    actionLabel: "Open Passport",
    endState: "Holder account with reusable eligibility and consent choices.",
    summary: "Carry reusable eligibility and choose what a partner can see.",
  },
  {
    id: "verify-result",
    title: "Verify a result",
    route: "/verification",
    status: "available",
    audience: "explorer",
    actionLabel: "Open verifier",
    endState: "Public receipt check without exposing private evidence.",
    summary: "Inspect a current, partner-bound receipt. Not the underlying evidence.",
  },
  {
    id: "reusable",
    title: "Reusable eligibility",
    route: "/docs/reusable-eligibility",
    status: "available",
    audience: "person",
    actionLabel: "Read how reuse works",
    endState: "Holder understands fresh consent before reuse.",
    summary: "Use one private verification again, with fresh consent each time.",
  },
  {
    id: "partner-flow",
    title: "Partner Flow",
    route: "/docs/partner-flow",
    status: "available",
    audience: "partner",
    actionLabel: "Open Partner Flow",
    endState: "Hosted request, consent, and server-side receipt verification.",
    summary: "Hosted request, consent, and server-side receipt verification.",
  },
  {
    id: "studio",
    title: "Integration Studio",
    route: "/developers/integration-studio",
    status: "available",
    audience: "partner",
    actionLabel: "Open Integration Studio",
    endState: "Partner assembles packs and snippets without issuing credentials.",
    summary: "Guided packs, snippets, and starter-kit generation.",
  },
  {
    id: "launchpad",
    title: "Partner Launchpad",
    route: "/developers/launchpad",
    status: "sandbox",
    audience: "partner",
    actionLabel: "Open Launchpad",
    endState: "Sandbox workspace. No Production activation from the browser.",
    summary: "Sandbox workspace and readiness path for partner apps.",
  },
  {
    id: "docs",
    title: "Developer docs",
    route: "/docs",
    status: "available",
    audience: "partner",
    actionLabel: "Open docs",
    endState: "Operator-safe protocol guides with next actions.",
    summary: "Partner Flow, adapters, and operator-safe protocol guides.",
  },
  {
    id: "policy-packs",
    title: "Policy packs",
    route: "/docs/policy-packs",
    status: "available",
    audience: "explorer",
    actionLabel: "Open policy packs",
    endState: "Pinned policies that ask only for a needed outcome.",
    summary: "Pinned policies that ask only for the outcome a partner needs.",
  },
  {
    id: "trading",
    title: "Trading access",
    route: "/examples/trading-venue",
    status: "sandbox",
    audience: "partner",
    actionLabel: "Try venue preflight",
    endState: "Sandbox eligibility preflight. Abraxas never places a trade.",
    summary: "Eligibility preflight for venue access. Abraxas never places a trade.",
  },
  {
    id: "payment",
    title: "Payment authorization",
    route: "/examples/payment-authorization",
    status: "sandbox",
    audience: "partner",
    actionLabel: "Try checkout preflight",
    endState: "Sandbox authorization decision. Abraxas does not process USDC or complete bookings.",
    summary: "Checkout eligibility preflight. Abraxas never moves funds or processes USDC.",
  },
  {
    id: "multichain",
    title: "Multi-chain readiness",
    route: "/docs/multichain-mainnet-readiness",
    status: "planned",
    audience: "explorer",
    actionLabel: "Read readiness",
    endState: "Accurate sandbox, testnet, and Mainnet posture. No silent activation.",
    summary: "Accurate sandbox, testnet, and Mainnet posture. No silent activation.",
  },
  {
    id: "good-trouble",
    title: "Good Trouble",
    route: "/good-trouble",
    status: "sandbox",
    audience: "person",
    actionLabel: "Try the sandbox example",
    endState: "Partner Flow eligibility result for a 21+ retail request. Partner owns any checkout.",
    summary: "Prove 21+ eligibility. The partner sees only the result. Evidence stays private.",
  },
  {
    id: "cielo-registry",
    title: "Cielo Sunrise registry record",
    route: "/flagship",
    status: "planned",
    audience: "explorer",
    actionLabel: "View registry record",
    endState: "Reference asset dossier. Not a bookable stay or USDC payment.",
    summary: "Genesis registry record. Not a live booking or payment rail.",
  },
  {
    id: "chickasaw",
    title: "Chickasaw Project",
    route: "/case-studies/chickasaw-project",
    status: "planned",
    audience: "explorer",
    actionLabel: "Read case study",
    endState: "Diligence narrative. Not a live transaction.",
    summary: "Property verification narrative for conventional diligence. Not a live deal.",
  },
  {
    id: "receipt-verify",
    title: "Receipt verification",
    route: "/verify?mode=receipt",
    status: "available",
    audience: "explorer",
    actionLabel: "Verify a receipt",
    endState: "Current partner-bound receipt check.",
    summary: "Confirm a signed result without seeing private evidence.",
  },
] as const;

export function publicHomeFlowById(id: string): PublicHomeFlow | undefined {
  return PUBLIC_HOME_FLOWS.find((flow) => flow.id === id);
}

export function publicFlowHrefPath(href: string): string {
  return href.split("#")[0]?.split("?")[0] ?? href;
}
