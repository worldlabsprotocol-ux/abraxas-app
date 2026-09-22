// FILE: lib/protocolLitepaper.ts
// Investor litepaper — problem, solution, proof, economics. No fabricated metrics.

export const LITEPAPER = {
  title: "Abraxas Protocol Litepaper",
  version: "1.0",
  tagline: "Prove one result. Keep the evidence private.",
  problem: {
    headline: "Verification debt",
    body:
      "Protocols repeatedly ask people and organizations for sensitive evidence. Abraxas is building a way to request a narrow eligibility result, with fresh holder consent and a current receipt check each time.",
    bullets: [
      "Repeated document uploads across platforms",
      "A result from one workflow rarely carries a clear policy and audience binding",
      "High-touch diligence that does not scale",
      "Partners need a safe way to reject stale or revoked results",
    ],
  },
  solution: {
    headline: "Reusable verification primitive",
    body:
      "Abraxas coordinates policy-bound eligibility. A holder consents to a specific request; the partner re-fetches the public receipt and applies its own rules. Issuer qualification and Production access remain reviewed steps.",
    layers: [
      { name: "Issuer review", desc: "Policy-qualified methods and assurance are controlled by a server-owned registry" },
      { name: "Private result", desc: "Only the policy outcome and allowed disclosure reach the partner" },
      { name: "Receipt lifecycle", desc: "Current public receipt re-fetch, revocation, and one-time presentation consumption" },
      { name: "Partner gate", desc: "EVM and Solana verifier code for named actions; partners own deployment and execution" },
    ],
  },
  moat: {
    headline: "Why this is infrastructure, not a listing site",
    points: [
      "One integration surface for scoped policy results across partner workflows",
      "Fresh consent and current verification on every reuse",
      "Revocation and replay controls across serverless workers",
      "Public verifier schemas and deterministic EVM/Solana vectors",
    ],
  },
  proof: {
    headline: "Inspect the current proof",
    items: [
      { label: "Sandbox flow", value: "Good Trouble 21+ eligibility with a partner-bound result", href: "/good-trouble" },
      { label: "Verification", value: "Current receipt verification and one-time presentation", href: "/docs/eligibility-presentation-protocol" },
      { label: "Institutional sandbox", value: "Operator-controlled test result, not live KYB", href: "/docs/organization-eligibility" },
      { label: "Chain gate", value: "Partner-owned Solana and EVM code, not a public deployment", href: "/institutional" },
    ],
  },
  economics: {
    headline: "Potential business model — validation remains",
    streams: [
      { name: "Partner verification", status: "Planned", desc: "Usage-based checks after external Production integrations" },
      { name: "Issuer integrations", status: "Planned", desc: "Reviewed method integrations for additional policies" },
      { name: "Enterprise support", status: "Planned", desc: "Deployment and compliance support for partner-owned gates" },
    ],
  },
  decentralization: {
    headline: "Progressive decentralization (honest)",
    phases: [
      { phase: "Phase 1 — Managed network", desc: "Abraxas controls policy and issuer registries, with sandbox partner integrations." },
      { phase: "Phase 2 — Approved issuers", desc: "External appraisers and legal reviewers on a verifier registry." },
      { phase: "Phase 3 — Delegated governance", desc: "Community input on credential standards and treasury policy." },
      { phase: "Phase 4 — Network economics", desc: "Staked validators for pipeline stages after real usage volume." },
    ],
  },
  northStar: {
    headline: "The adoption milestone",
    body:
      "We will measure independently operated partner integrations that verify current results, followed by recurring paid usage. Sandbox tests and code artifacts are reported separately.",
    metric: "First unaffiliated end-to-end partner integration",
  },
  brand: {
    hierarchy: [
      { name: "Abraxas", role: "Protocol and product brand" },
      { name: "World Labs Protocol", role: "Parent company" },
      { name: "Abraxas Passport", role: "User identity credential" },
      { name: "Abraxas Registry", role: "Asset credential registry" },
      { name: "Abraxas API", role: "Developer integration product" },
    ],
  },
} as const;
