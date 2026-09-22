/** Diligence links point to inspectable product behavior and source-owned status. */
export const DATA_ROOM_SECTIONS = [
  {
    title: "Start with the product",
    items: [
      { label: "Good Trouble sandbox", href: "/good-trouble", desc: "Try a labeled 21+ Partner Flow example" },
      { label: "Receipt verification", href: "/verification", desc: "Inspect a current, partner-bound public result" },
      { label: "Institutional proof map", href: "/institutional", desc: "Capability status, evidence links, and remaining gates" },
      { label: "Operational metrics", href: "/metrics", desc: "Source-backed counters when data is available" },
    ],
  },
  {
    title: "Partner integration",
    items: [
      { label: "Hosted Partner Flow", href: "/docs/hosted-partner-flow-handoff", desc: "Request, fresh consent, and receipt re-fetch" },
      { label: "Eligibility presentation protocol", href: "/docs/eligibility-presentation-protocol", desc: "Audience binding and one-time verification" },
      { label: "Integration Studio", href: "/developers/integration-studio", desc: "Build against named sandbox capabilities" },
      { label: "Launchpad", href: "/developers/launchpad", desc: "Sandbox app configuration and Production review path" },
    ],
  },
  {
    title: "Chain evidence",
    items: [
      { label: "Solana eligibility gate", href: "/docs/solana-onchain-eligibility-gate", desc: "Partner-owned V2 gate; human devnet deployment remains" },
      { label: "EVM eligibility gate", href: "/docs/evm-onchain-eligibility-gate", desc: "Partner-owned verifier and local contract tests" },
      { label: "Verifier conformance", href: "/docs/onchain-verifier-conformance", desc: "Deterministic vectors and local verification" },
      { label: "Network readiness", href: "/docs/multichain-mainnet-readiness", desc: "Testnet versus Mainnet posture" },
    ],
  },
  {
    title: "Diligence",
    items: [
      { label: "Security", href: "/security", desc: "Controls and review posture" },
      { label: "Litepaper", href: "/docs/litepaper", desc: "Problem, design, evidence, and limitations" },
      { label: "Pitch", href: "/investors/pitch", desc: "Current product thesis and milestones" },
      { label: "Source code", href: "https://github.com/worldlabsprotocol-ux/abraxas-app", desc: "Public application repository" },
    ],
  },
] as const;

export const LEADING_INDICATORS = [
  "Independent partner integrations that complete a current receipt check",
  "Time from request to consented eligibility result",
  "Receipt revocation and replay rejection measured in production",
  "Verified testnet gate deployments and conformance passes",
  "Paid partner usage, reported separately from sandbox tests",
] as const;
