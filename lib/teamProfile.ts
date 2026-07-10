// FILE: lib/teamProfile.ts
// Execution & team transparency for partner diligence.

export const TEAM_MISSION =
  "Abraxas is building reusable verification infrastructure for real-world assets — so identity and asset proof travel with the transaction, not trapped in PDFs and repeated KYC forms.";

export const CURRENT_TEAM = [
  {
    name: "Sae'Von Holloway",
    role: "Founder & Protocol Lead",
    focus: "Product, verification architecture, V5 pipeline, and first-party asset pilots (including Cielo Sunrise)",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/company/worldlabsprotocol/" },
      { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
    ],
    bio: "Built World Labs Protocol and Abraxas after running the same verification process on the founding team's own assets first. Ships full-stack: Move modules, credential engine, booking rails, and partner-facing documentation.",
  },
] as const;

export const PLANNED_ROLES = [
  {
    role: "Smart contract / Move engineer",
    timing: "When needed",
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
  { label: "Open source", href: "https://github.com/worldlabsprotocol-ux/abraxas-app", desc: "Full Next.js app — clone and inspect locally" },
  { label: "Documentation", href: "/docs", desc: "Architecture, litepaper, and technical specs" },
] as const;

export const BUILDER_CONTEXT = {
  headline: "Solo builder today — protocol team tomorrow",
  body: "Abraxas is early-stage infrastructure. The founding team ships vertically integrated proof (identity, assets, payments, docs) to de-risk the core thesis before scaling headcount. Milestones: mainnet Passport, first external relying party, and security audit completion.",
} as const;
