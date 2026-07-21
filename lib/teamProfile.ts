// FILE: lib/teamProfile.ts
// Execution & team transparency for investor diligence.

export const TEAM_MISSION =
  "Abraxas is building reusable verification infrastructure for real-world assets — so identity and asset proof travel with the transaction, not trapped in PDFs and repeated KYC forms.";

export const CURRENT_TEAM = [
  {
    name: "Sae'Von Holloway",
    role: "Founder & Protocol Lead",
    location: "American reservation · United States",
    focus: "Twenty years in markets · full-stack protocol · genesis asset pilots (Cielo, Chickasaw, Smyrna)",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/company/worldlabsprotocol/" },
      { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
      { label: "From the builder", href: "/blog/founder" },
    ],
    bio: "Trader and builder — not a slide-deck founder. Built World Labs Protocol and Abraxas after running verification on the team's own assets first. Ships Move modules, credential engine, booking rails, MLS monitoring, and partner APIs. The protocol speaks; the builder stands behind it.",
  },
] as const;

export const PLANNED_ROLES = [
  {
    role: "Smart contract / Move engineer",
    timing: "Post seed",
    why: "Mainnet Passport deployment, external CPI integrations, escrow program containers",
  },
  {
    role: "Compliance & legal counsel (fractional)",
    timing: "Active search",
    why: "Securities framing, cross-border credential acceptance, relying-party agreements",
  },
  {
    role: "Design partner success",
    timing: "First external relying party signed",
    why: "Onboard lenders and marketplaces onto credential verify API",
  },
  {
    role: "Security engineer",
    timing: "Post audit",
    why: "Bug bounty triage, key rotation, production incident response",
  },
] as const;

export const ADVISOR_BENCH = {
  status: "Building",
  note: "Formal advisor agreements are in progress. We name advisors publicly only after engagement letters are signed — no logo walls without substance.",
  targetProfiles: [
    "RWA / private credit operator with live deal flow",
    "Identity / KYC infrastructure (ex-Veriff, ex-Jumio, ex-Onfido)",
    "Institutional DeFi or lending protocol BD",
    "Georgia / Wyoming real-estate or hospitality counsel",
  ],
} as const;

export const EXECUTION_PROOF = [
  { label: "Live product", href: "/", desc: "Three-door infrastructure homepage + public verifier" },
  { label: "Genesis asset", href: "/case-studies/cielo", desc: "Cielo Sunrise end-to-end with booking revenue" },
  { label: "Open source", href: "https://github.com/worldlabsprotocol-ux/abraxas-app", desc: "Full Next.js app — VCs can clone and inspect" },
  { label: "Data room", href: "/investors", desc: "Litepaper, metrics, pitch deck, transparency log" },
] as const;

export const BUILDER_CONTEXT = {
  headline: "Solo builder today — protocol team tomorrow",
  body: "Abraxas is early-stage infrastructure built with the discipline of two decades in markets: position before the crowd, verify before you transact, close every loop before you pitch. Fundraising targets engineering and compliance hires tied to mainnet Passport, first external relying party, and audit completion.",
} as const;
