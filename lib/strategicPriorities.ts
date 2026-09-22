// Milestones are product gates; completion never implies a partner, revenue, or chain deployment.
export const STRATEGIC_PILLARS = [
  {
    id: "sandbox",
    order: 1,
    title: "Complete the sandbox proof",
    headline: "Show one private result through consent and current receipt verification",
    status: "in_progress" as const,
    statusLabel: "Sandbox available",
    why: "Judges can inspect the flow while all production and partner claims stay separate.",
    milestones: [
      { label: "Good Trouble 21+ example", done: true, href: "/good-trouble" },
      { label: "Current receipt verification", done: true, href: "/verification" },
      { label: "Independent external partner run", done: false, href: "/developers/launchpad" },
    ],
    primaryHref: "/good-trouble",
    primaryCta: "Try sandbox →",
  },
  {
    id: "chains",
    order: 2,
    title: "Prove the partner-owned gates",
    headline: "Move from local EVM/Solana tests to verified testnet deployments",
    status: "in_progress" as const,
    statusLabel: "Code ready · deploy pending",
    why: "A published, independently checked gate is stronger evidence than a build or a deployment plan.",
    milestones: [
      { label: "Verifier conformance vectors", done: true, href: "/docs/onchain-verifier-conformance" },
      { label: "Human Solana devnet deployment", done: false, href: "/docs/testnet-gate-deployment" },
      { label: "Verified partner registration", done: false, href: "/docs/testnet-gate-deployment" },
    ],
    primaryHref: "/docs/testnet-gate-deployment",
    primaryCta: "Deployment requirements →",
  },
  {
    id: "external",
    order: 3,
    title: "Earn external reliance",
    headline: "Get one unaffiliated protocol to verify and use a current result",
    status: "planned" as const,
    statusLabel: "External proof pending",
    why: "This is the adoption test: a partner integrates without handing Abraxas transaction authority.",
    milestones: [
      { label: "Integration Studio", done: true, href: "/developers/integration-studio" },
      { label: "Reviewed Production access", done: false, href: "/docs/production-review" },
      { label: "Measured partner verification", done: false, href: "/metrics" },
    ],
    primaryHref: "/developers/integration-studio",
    primaryCta: "Build with Abraxas →",
  },
  {
    id: "economics",
    order: 4,
    title: "Validate the business",
    headline: "Measure repeat checks and paid usage after partner launch",
    status: "planned" as const,
    statusLabel: "Commercial proof pending",
    why: "Sandbox traffic and test receipts should never be presented as customers or revenue.",
    milestones: [
      { label: "Public proof map", done: true, href: "/institutional" },
      { label: "Independent partner usage", done: false, href: "/metrics" },
      { label: "Paid usage", done: false, href: "/metrics" },
    ],
    primaryHref: "/investors",
    primaryCta: "Investor data room →",
  },
] as const;

export const PILLAR_STATUS_COLOR = {
  live: "#10B981",
  in_progress: "#F59E0B",
  planned: "#3B82F6",
} as const;
