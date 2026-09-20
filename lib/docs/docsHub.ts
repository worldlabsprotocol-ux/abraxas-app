// FILE: lib/docs/docsHub.ts
// Documentation hub structure — short summaries with Read More links.

export interface DocLink {
  label: string;
  href: string;
}

export interface DocTopic {
  id: string;
  title: string;
  summary: string;
  readMore?: DocLink;
  links?: DocLink[];
}

export interface DocGroup {
  id: string;
  title: string;
  topics: DocTopic[];
}

export const DOCS_HUB_GROUPS: DocGroup[] = [
  {
    id: "overview",
    title: "Overview",
    topics: [
      {
        id: "overview",
        title: "Overview",
        summary:
          "Abraxas is reusable trust infrastructure for tokenized assets and permissioned finance. Users verify once; partners check cryptographic proof instead of re-collecting documents.",
        readMore: { label: "Why verification", href: "/docs/why-verification" },
      },
    ],
  },
  {
    id: "quick-start",
    title: "Quick Start",
    topics: [
      {
        id: "quick-start",
        title: "Quick Start",
        summary:
          "Google zkLogin creates an account only. A partner policy requests only missing evidence, then your server verifies the signed receipt before granting access.",
        links: [
          { label: "Passport", href: "/passport" },
          { label: "Progressive proof", href: "/docs/progressive-proof" },
          { label: "Policy packs", href: "/docs/policy-packs" },
          { label: "Integrate", href: "/integrate" },
          { label: "Partner Flow", href: "/docs/partner-flow" },
          { label: "Relying party guide", href: "/docs/relying-party-verify" },
        ],
      },
    ],
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    topics: [
      {
        id: "passport",
        title: "Passport",
        summary:
          "Google sign-in opens an Abraxas account only. It does not prove eligibility. Additional checks run only when a partner policy requires them.",
        readMore: { label: "Passport spec", href: "/docs/passport-spec" },
        links: [
          { label: "zkLogin setup", href: "/docs/zklogin-setup" },
          { label: "Sui integration", href: "/docs/sui" },
          { label: "Solana integration", href: "/docs/solana" },
          { label: "Trading venue adapter", href: "/docs/trading-venue" },
          { label: "Trading venue profiles", href: "/docs/trading-venue-profiles" },
          { label: "Wallet Standard binding", href: "/docs/wallet-standard-binding" },
          { label: "Payment authorization", href: "/docs/payment-authorization" },
          { label: "Portable action contract", href: "/docs/portable-action-contract" },
          { label: "EVM partner adapter", href: "/docs/evm-partner-adapter" },
          { label: "EVM wallet-control binding", href: "/docs/evm-wallet-binding" },
          { label: "Receipt key lifecycle", href: "/docs/receipt-key-lifecycle" },
          { label: "Selective disclosure", href: "/docs/selective-disclosure" },
          { label: "Policy compatibility", href: "/docs/policy-compatibility" },
        ],
      },
      {
        id: "biometrics",
        title: "Biometrics",
        summary:
          "Identity or liveness is not the default path. A partner policy may request identity evidence only when that policy truly requires it. Google sign-in is account access only.",
        readMore: { label: "Verify on Passport", href: "/passport" },
      },
      {
        id: "trust-registry",
        title: "Trust Registry",
        summary:
          "Issued credentials can be presented to relying parties. Partners receive approve/deny/review decisions without receiving raw document images by default.",
        readMore: { label: "Credential portability", href: "/docs/credential-portability" },
      },
      {
        id: "assets",
        title: "Assets",
        summary:
          "Assets move through staged verification: identity, ownership, legal, due diligence, risk scoring, and marketplace readiness. Each stage produces audit events.",
        readMore: { label: "Submit an asset", href: "/build" },
      },
    ],
  },
  {
    id: "developer",
    title: "Developer Docs",
    topics: [
      {
        id: "api",
        title: "API",
        summary:
          "Partner Flow redirect, POST /api/credentials/verify, verification requests, and public receipt verification.",
        links: [
          { label: "Progressive proof quickstart", href: "/docs/progressive-proof" },
          { label: "Policy packs", href: "/docs/policy-packs" },
          { label: "Integration Kit", href: "/docs/integration-kit" },
          { label: "Integration Studio", href: "/developers/integration-studio" },
          { label: "Starter kit generator", href: "/docs/starter-kit" },
          { label: "Solana integration", href: "/docs/solana" },
          { label: "Trading venue adapter", href: "/docs/trading-venue" },
          { label: "Trading venue profiles", href: "/docs/trading-venue-profiles" },
          { label: "Wallet Standard binding", href: "/docs/wallet-standard-binding" },
          { label: "Payment authorization", href: "/docs/payment-authorization" },
          { label: "Portable action contract", href: "/docs/portable-action-contract" },
          { label: "EVM partner adapter", href: "/docs/evm-partner-adapter" },
          { label: "EVM wallet-control binding", href: "/docs/evm-wallet-binding" },
          { label: "Receipt key lifecycle", href: "/docs/receipt-key-lifecycle" },
          { label: "Selective disclosure", href: "/docs/selective-disclosure" },
          { label: "Policy compatibility", href: "/docs/policy-compatibility" },
          { label: "Reusable eligibility", href: "/docs/reusable-eligibility" },
          { label: "Partner Action Control Plane", href: "/docs/action-control-plane" },
          { label: "Sandbox partner contract", href: "/docs/sandbox-conformance" },
          { label: "Partner Event Delivery", href: "/docs/partner-event-delivery" },
          { label: "Circle Arc testnet settlement", href: "/docs/circle-arc-testnet" },
          { label: "Multi-chain Mainnet readiness", href: "/docs/multichain-mainnet-readiness" },
          { label: "Partner Flow", href: "/docs/partner-flow" },
          { label: "Partner Flow API (OpenAPI)", href: "/docs/partner-flow-api" },
          { label: "Protocol compatibility manifest (JSON API)", href: "/api/protocol/compatibility" },
          { label: "AI agents", href: "/docs/ai-agents" },
          { label: "Partner verification requests", href: "/docs/partner-verification-requests" },
        ],
      },
      {
        id: "architecture",
        title: "Architecture",
        summary:
          "AIL layers: providers, credentials, registry, compliance. Licensed or Abraxas-native identity capture → W3C Verifiable Credentials (did:sui, Ed25519 JWT) → trust registry and policy engine.",
        readMore: { label: "AIL specification", href: "/docs/ail" },
        links: [
          { label: "Architecture", href: "/docs/architecture" },
          { label: "Chain", href: "/docs/chain" },
        ],
      },
      {
        id: "security",
        title: "Security",
        summary:
          "Service role keys and signing keys are server side only. Supabase RLS on all tables. Biometric assessments and reviewer actions produce audit records.",
        readMore: { label: "Security page", href: "/security" },
      },
    ],
  },
  {
    id: "roadmap",
    title: "Roadmap",
    topics: [
      {
        id: "roadmap",
        title: "Roadmap & integration status",
        summary:
          "Live on abraxasworld.xyz: Partner Flow APIs, OpenAPI contract, P1-2 validity/idempotency, P1-3 audit traceability. Open gates: IAT, external security review, v1.0.0-beta.0.",
        links: [
          { label: "Roadmap", href: "/roadmap" },
          { label: "Integration readiness", href: "/docs/integration-readiness" },
          { label: "Partner Flow", href: "/docs/partner-flow" },
          { label: "Live metrics", href: "/metrics" },
        ],
      },
    ],
  },
];

export const DOCS_HUB_NAV = DOCS_HUB_GROUPS.map((g) => ({ id: g.id, title: g.title }));

export function getDocsHubGroup(groupId: string): DocGroup | undefined {
  return DOCS_HUB_GROUPS.find((g) => g.id === groupId);
}
