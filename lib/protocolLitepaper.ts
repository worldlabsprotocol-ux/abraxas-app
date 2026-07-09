// FILE: lib/protocolLitepaper.ts
// Investor litepaper — problem, solution, proof, economics. No fabricated metrics.

export const LITEPAPER = {
  title: "Abraxas Protocol Litepaper",
  version: "1.0",
  tagline: "Verify once. Transact everywhere.",
  problem: {
    headline: "Verification debt",
    body:
      "Every lender, marketplace, and protocol re-runs the same KYC, title review, and appraisal work. Real assets stay illiquid because trust does not travel with the asset. Abraxas makes proof reusable — checked once, carried everywhere.",
    bullets: [
      "Repeated document uploads across platforms",
      "No portable credential between DeFi and TradFi",
      "High-touch diligence that does not scale",
      "Investors cannot verify ownership without starting over",
    ],
  },
  solution: {
    headline: "Reusable verification primitive",
    body:
      "Abraxas is identity and compliance infrastructure — not another marketplace. Licensed providers verify. Abraxas standardizes cryptographic proof. Protocols query Abraxas; users consent once.",
    layers: [
      { name: "Licensed providers", desc: "Veriff IDV, appraisers, title, legal counsel" },
      { name: "Credential engine", desc: "W3C Verifiable Credentials, Ed25519, did:sui" },
      { name: "Trust registry", desc: "Stamp bitmask on Sui Passport + API for integrators" },
      { name: "Compliance engine", desc: "10-stage V5 asset pipeline with human + AI review" },
      { name: "Identity Passport", desc: "Google sign-in, optional ID check, portable stamps" },
    ],
  },
  moat: {
    headline: "Why this is infrastructure, not a listing site",
    points: [
      "B2B network effects — external protocols integrate Abraxas Passport via API",
      "Credential reuse — second check is cheaper than the first",
      "Post-issuance monitoring — assets stay trustworthy over time (roadmap)",
      "Standards-based — W3C VC + open verification endpoints",
    ],
  },
  proof: {
    headline: "Live proof today",
    items: [
      { label: "Genesis asset", value: "Cielo Sunrise · $1.1M appraised hospitality property", href: "/case-studies/cielo" },
      { label: "Booking loop", value: "Request → confirm → USDC pay → receipt on Sui", href: "/flagship" },
      { label: "Identity", value: "Google zkLogin + optional Veriff ID check", href: "/passport" },
      { label: "Developer spec", value: "Abraxas Identity Layer (AIL)", href: "/docs/ail" },
    ],
  },
  economics: {
    headline: "Revenue paths (live + planned)",
    streams: [
      { name: "Verification packages", status: "Live", desc: "ID check, KYB, property attestation tiers" },
      { name: "Wyoming LLC engine", status: "Live", desc: "Entity formation for tokenized assets" },
      { name: "Passport query fees", status: "Planned", desc: "USDC fee when external protocols verify credentials" },
      { name: "Asset monitoring", status: "Planned", desc: "Ongoing valuation, income, and compliance refresh" },
      { name: "Music royalty audit", status: "Live intake", desc: "Catalog verification for publishing clients" },
    ],
  },
  decentralization: {
    headline: "Progressive decentralization (honest)",
    phases: [
      { phase: "Phase 1 — Managed network", desc: "Central approval committee, Abraxas-operated infrastructure. Live today." },
      { phase: "Phase 2 — Approved issuers", desc: "External appraisers and legal reviewers on a verifier registry." },
      { phase: "Phase 3 — Delegated governance", desc: "Community input on credential standards and treasury policy." },
      { phase: "Phase 4 — Network economics", desc: "Staked validators for pipeline stages after real usage volume." },
    ],
  },
  northStar: {
    headline: "The $100M operating milestone",
    body:
      "We measure protocol scale by independently verified, actively monitored asset value processed through Abraxas — not headline token market cap. Valuation follows the business.",
    metric: "$100M in verified, monitored asset value",
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
