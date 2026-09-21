// FILE: lib/product/publicJourneyManifest.ts
// Public-product journey contract. DEMO hosting does not hide these surfaces.

export const PUBLIC_JOURNEY_SURFACES = [
  {
    route: "/",
    purpose: "Reusable private eligibility for people and partners.",
    primaryCta: { label: "Create your Passport", href: "/passport" },
    file: "app/page.tsx",
  },
  {
    route: "/passport",
    purpose: "Holder Passport for account, optional wallet binding, and partner return.",
    primaryCta: { label: "Open Passport", href: "/passport" },
    file: "app/passport/page.tsx",
  },
  {
    route: "/verification",
    purpose: "Intro to server-verified public receipts, then the live verifier.",
    primaryCta: { label: "Open receipt verifier →", href: "/verify?mode=receipt" },
    file: "app/verification/page.tsx",
  },
  {
    route: "/verify",
    purpose: "Public receipt, registry, and credential tester.",
    primaryCta: { label: "Open Passport", href: "/passport?view=verify&mode=registry" },
    file: "app/verify/page.tsx",
  },
  {
    route: "/developers",
    purpose: "Developer hub for Partner Flow, Studio, Launchpad, and adapters.",
    primaryCta: { label: "Integration Studio →", href: "/developers/integration-studio" },
    file: "app/developers/page.tsx",
  },
  {
    route: "/developers/integration-studio",
    purpose: "Guided packs, snippets, and starter-kit generation.",
    primaryCta: { label: "Generate starter kit", href: "/developers/integration-studio" },
    file: "app/developers/integration-studio/page.tsx",
  },
  {
    route: "/developers/launchpad",
    purpose: "Partner Launchpad sandbox workspace and readiness path.",
    primaryCta: { label: "Partner Launchpad", href: "/developers/launchpad" },
    file: "app/developers/launchpad/page.tsx",
  },
  {
    route: "/docs",
    purpose: "Documentation hub for Partner Flow and adapters.",
    primaryCta: { label: "Partner Flow", href: "/docs/partner-flow" },
    file: "app/docs/page.tsx",
  },
  {
    route: "/docs/hosted-partner-flow-handoff",
    purpose: "Universal Hosted Partner Flow handoff. Backend create, holder consent, server receipt verify.",
    primaryCta: { label: "Partner Flow docs", href: "/docs/partner-flow" },
    file: "app/docs/hosted-partner-flow-handoff/page.tsx",
  },
  {
    route: "/docs/receipt-lifecycle-events",
    purpose: "Receipt lifecycle webhooks. HMAC, re-fetch, Partner Kit. Notifications, not grants.",
    primaryCta: { label: "Partner Event Delivery", href: "/docs/partner-event-delivery" },
    file: "app/docs/receipt-lifecycle-events/page.tsx",
  },
  {
    route: "/docs/starter-kit",
    purpose: "Starter kit contract and generator entry.",
    primaryCta: { label: "Open Integration Studio →", href: "/developers/integration-studio" },
    file: "app/docs/starter-kit/page.tsx",
  },
  {
    route: "/docs/sandbox-conformance",
    purpose: "Local end-to-end sandbox partner contract before a real holder test.",
    primaryCta: { label: "Open Partner Launchpad", href: "/developers/launchpad" },
    file: "app/docs/sandbox-conformance/page.tsx",
  },
  {
    route: "/docs/trading-venue",
    purpose: "Trading venue policy preflight. Abraxas does not execute trades.",
    primaryCta: { label: "Enable market access example", href: "/examples/trading-venue" },
    file: "app/docs/trading-venue/page.tsx",
  },
  {
    route: "/docs/trading-venue-profiles",
    purpose: "Server-owned venue integration profiles. Preflight only. No partnership or execution.",
    primaryCta: { label: "Trading venue adapter", href: "/docs/trading-venue" },
    file: "app/docs/trading-venue-profiles/page.tsx",
  },
  {
    route: "/docs/payment-authorization",
    purpose: "Payment authorization preflight. Abraxas does not move money.",
    primaryCta: { label: "Checkout authorization example", href: "/examples/payment-authorization" },
    file: "app/docs/payment-authorization/page.tsx",
  },
  {
    route: "/docs/portable-action-contract",
    purpose: "Canonical partner action preflight. Abraxas never executes the action.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/portable-action-contract/page.tsx",
  },
  {
    route: "/docs/chain-verifiable-attestations",
    purpose: "Chain-verifiable eligibility attestations for partner-owned EVM and Solana verifiers.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/chain-verifiable-attestations/page.tsx",
  },
  {
    route: "/docs/solana-onchain-eligibility-gate",
    purpose: "Partner-owned Solana eligibility gate. Local/reference program. No live deployment.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/solana-onchain-eligibility-gate/page.tsx",
  },
  {
    route: "/docs/evm-onchain-eligibility-gate",
    purpose: "Partner-owned EVM eligibility gate. Local Foundry tests. No live or Arc deployment.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/evm-onchain-eligibility-gate/page.tsx",
  },
  {
    route: "/docs/onchain-gate-deployments",
    purpose: "Verified partner-owned EVM and Solana gate deployment registry. Not a deployer.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/onchain-gate-deployments/page.tsx",
  },
  {
    route: "/docs/chain-attestation-signer-lifecycle",
    purpose: "Rotate or revoke EVM and Solana chain-attestation signers. Partners update their own gate.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/chain-attestation-signer-lifecycle/page.tsx",
  },
  {
    route: "/docs/reclaim-private-attestations",
    purpose: "Server-only Reclaim private attestation adapter. Partners never receive the raw proof.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/reclaim-private-attestations/page.tsx",
  },
  {
    route: "/docs/eligibility-presentation-protocol",
    purpose: "Server-to-server private eligibility presentation. Not a passport or bearer credential.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/eligibility-presentation-protocol/page.tsx",
  },
  {
    route: "/docs/cross-chain-protocol-access",
    purpose: "Partner-owned activate_protocol_access on EVM and Solana. Local/sandbox reference only.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/cross-chain-protocol-access/page.tsx",
  },
  {
    route: "/docs/testnet-gate-deployment",
    purpose: "Human-operated Solana devnet and EVM testnet gate deployment kit. Not a hosted deployer.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/testnet-gate-deployment/page.tsx",
  },
  {
    route: "/docs/selective-disclosure",
    purpose: "Canonical selective-disclosure boundary. Policy result only, not evidence.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/selective-disclosure/page.tsx",
  },
  {
    route: "/docs/wallet-standard-binding",
    purpose: "Optional message-only wallet binding. Never transaction signing.",
    primaryCta: { label: "Integration Studio", href: "/developers/integration-studio" },
    file: "app/docs/wallet-standard-binding/page.tsx",
  },
  {
    route: "/examples/trading-venue",
    purpose: "Sandbox Enable market access preflight reference.",
    primaryCta: { label: "Open Partner Flow →", href: "/docs/trading-venue" },
    file: "app/examples/trading-venue/page.tsx",
  },
  {
    route: "/examples/payment-authorization",
    purpose: "Sandbox checkout authorization preflight reference.",
    primaryCta: { label: "Payment docs →", href: "/docs/payment-authorization" },
    file: "app/examples/payment-authorization/page.tsx",
  },
  {
    route: "/design-partner",
    purpose: "Design-partner application plus available sandbox tools.",
    primaryCta: { label: "Apply for review", href: "/integrations#apply" },
    file: "app/design-partner/page.tsx",
  },
  {
    route: "/good-trouble",
    purpose: "Good Trouble sandbox Partner Flow for 21+ eligibility. Not a live checkout.",
    primaryCta: { label: "Start sandbox verification", href: "/good-trouble/checkout" },
    file: "app/good-trouble/page.tsx",
  },
] as const;

export type PublicJourneySurface = (typeof PUBLIC_JOURNEY_SURFACES)[number];

export const PUBLIC_JOURNEY_NEXT_STEPS = [
  { href: "/developers/integration-studio", label: "Integration Studio" },
  { href: "/docs/starter-kit", label: "Starter Kit" },
  { href: "/developers/launchpad", label: "Launchpad" },
  { href: "/docs/partner-flow", label: "Partner Flow docs" },
] as const;

export function journeyHrefPath(href: string): string {
  return href.split("#")[0]?.split("?")[0] ?? href;
}

export function publicJourneyPageFile(route: string): string {
  const path = journeyHrefPath(route);
  if (path === "/") return "app/page.tsx";
  return `app${path}/page.tsx`;
}

export function publicApiRouteFile(path: string): string {
  return `app${path}/route.ts`;
}
