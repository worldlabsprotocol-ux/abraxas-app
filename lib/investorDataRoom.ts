// FILE: lib/investorDataRoom.ts
// Data room index — single map of diligence materials.

export const DATA_ROOM_SECTIONS = [
  {
    title: "Start here",
    items: [
      { label: "Strategic roadmap (4 pillars)", href: "/investors/strategy", desc: "Relying party · Cielo · audit · team" },
      { label: "Litepaper", href: "/docs/litepaper", desc: "Problem, solution, proof, economics" },
      { label: "Chain architecture", href: "/docs/chain", desc: "Why Sui + Solana — intentional split" },
      { label: "Live metrics", href: "/metrics", desc: "Wallets, credentials, Cielo bookings" },
    ],
  },
  {
    title: "Traction & integrations",
    items: [
      { label: "Relying party program", href: "/integrations/relying-parties", desc: "How external protocols verify credentials" },
      { label: "Protocol integrations", href: "/integrations", desc: "SDK, registry, design partner apply" },
      { label: "Pitch deck", href: "/investors/pitch", desc: "12-slide web deck for VC meetings" },
      { label: "Investor update template", href: "/investors/updates", desc: "Monthly update structure" },
      { label: "Cielo E2E health check", href: "/ops/cielo-e2e", desc: "Pre-demo revenue loop verification" },
      { label: "Cielo Sunrise case study", href: "/case-studies/cielo", desc: "Genesis asset · booking · revenue loop" },
      { label: "Flagship dossier", href: "/flagship", desc: "Full property, financials, calendar" },
      { label: "Transparency log", href: "/transparency", desc: "Live operational events from Supabase" },
      { label: "Economics model", href: "/economics", desc: "Pro forma and unit economics" },
    ],
  },
  {
    title: "Technical diligence",
    items: [
      { label: "AIL specification", href: "/docs/ail", desc: "Full product and API spec" },
      { label: "Architecture", href: "/docs/architecture", desc: "Five-layer stack" },
      { label: "Passport spec", href: "/docs/passport-spec", desc: "On-chain stamp layout" },
      { label: "Roadmap", href: "/roadmap", desc: "Live / in progress / up next" },
    ],
  },
  {
    title: "Token & security",
    items: [
      { label: "Tokenomics", href: "/tokenomics", desc: "Live $ABRA + institutional framework" },
      { label: "Security & bug bounty", href: "/security/bounty", desc: "Audit tracker, scope, pre-registration" },
      { label: "Security overview", href: "/security", desc: "Practices, key management, kill-switch" },
      { label: "Legal", href: "/legal", desc: "Terms, privacy, risk disclosures" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Institutional overview", href: "/institutional", desc: "Partners, audit trail, pillars" },
      { label: "Partners", href: "/partners", desc: "Veriff, Utila, CV5, and more" },
      { label: "Team & execution", href: "/about/team", desc: "Current team, planned growth, advisor bench" },
      { label: "About explainer", href: "/about", desc: "Mission and visual overview" },
      { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app", desc: "Open-source app" },
    ],
  },
] as const;

export const LEADING_INDICATORS = [
  "Days from asset submission to verified credential",
  "Credential reuse rate across external queries",
  "Captured Cielo bookings and USDC revenue",
  "zkLogin wallets registered",
  "Active credentials issued (non-revoked)",
  "Assets in V5 pipeline by stage",
  "External protocol integrations (LOIs / live)",
  "Gross margin by verification workflow",
] as const;
