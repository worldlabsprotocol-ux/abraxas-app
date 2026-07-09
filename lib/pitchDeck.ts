// FILE: lib/pitchDeck.ts
// Web pitch deck content — 12 slides for VC conversations.

export interface PitchSlide {
  id: string;
  title: string;
  bullets: string[];
  highlight?: string;
  link?: { label: string; href: string };
}

export const PITCH_DECK: PitchSlide[] = [
  {
    id: "problem",
    title: "Verification debt",
    bullets: [
      "Every lender, marketplace, and protocol re-runs KYC independently",
      "Real assets stay illiquid because trust does not travel",
      "High-touch diligence does not scale to $100M+ asset volume",
    ],
    highlight: "Users upload the same documents dozens of times.",
  },
  {
    id: "solution",
    title: "Verify once. Transact everywhere.",
    bullets: [
      "Licensed providers verify (Veriff, appraisers, legal)",
      "Abraxas issues portable W3C credentials on Sui",
      "Protocols query Abraxas — users consent once",
    ],
    link: { label: "Litepaper", href: "/docs/litepaper" },
  },
  {
    id: "moat",
    title: "Infrastructure, not a marketplace",
    bullets: [
      "B2B network effects — SDK + API for any RWA protocol",
      "Credential reuse lowers cost per check over time",
      "Post-issuance monitoring keeps assets trustworthy (roadmap)",
    ],
    highlight: "4-line integration: GET /api/trust/status",
    link: { label: "Integrations", href: "/integrations" },
  },
  {
    id: "proof",
    title: "Live proof: Cielo Sunrise",
    bullets: [
      "$1.1M appraised hospitality property in Georgia",
      "Public Airbnb + Abraxas Protocol Calendar",
      "Book → confirm → USDC on Sui → on-chain receipt",
    ],
    link: { label: "Case study", href: "/case-studies/cielo" },
  },
  {
    id: "product",
    title: "What ships today",
    bullets: [
      "Google zkLogin wallet — no seed phrase",
      "Optional ID check via licensed provider",
      "10-stage V5 asset pipeline",
      "Wyoming LLC engine + music audit intake",
    ],
    link: { label: "Roadmap", href: "/roadmap" },
  },
  {
    id: "architecture",
    title: "Sui for trust · Solana for $ABRA",
    bullets: [
      "Sui: identity, credentials, passports, USDC booking",
      "Solana: optional $ABRA access tiers (fair launch)",
      "Sensitive data off-chain — only proofs anchor publicly",
    ],
    link: { label: "Chain architecture", href: "/docs/chain" },
  },
  {
    id: "traction",
    title: "Traction & metrics",
    bullets: [
      "Live metrics from Supabase — wallets, credentials, bookings",
      "Cielo revenue loop instrumented end-to-end",
      "Design partner pipeline for external protocol acceptance",
    ],
    link: { label: "Live metrics", href: "/metrics" },
  },
  {
    id: "economics",
    title: "Revenue paths",
    bullets: [
      "Verification packages (ID, KYB, property attestation)",
      "Wyoming LLC formation fees",
      "Future: passport query fees + asset monitoring",
    ],
    link: { label: "Economics model", href: "/economics" },
  },
  {
    id: "token",
    title: "$ABRA — work token, not a gate",
    bullets: [
      "Not required to verify or book on Abraxas",
      "Fee tiers for holders · future validator staking",
      "USDC for user fees · $ABRA for coordination (planned)",
    ],
    link: { label: "Tokenomics", href: "/tokenomics" },
  },
  {
    id: "team",
    title: "Team & execution",
    bullets: [
      "Solo founder shipped: Cielo live, zkLogin, Veriff, full redesign",
      "18% team pool reserved for CTO + Head of Compliance post-funding",
      "Differentiated: tribal rights, royalties, reusable verification",
    ],
    link: { label: "About", href: "/about" },
  },
  {
    id: "ask",
    title: "Use of funds",
    bullets: [
      "Senior technical hire (Move/mainnet + API scale)",
      "Compliance counsel for RWA securities framework",
      "Second verified asset + first external protocol integration",
      "Security audit (Move Passport mainnet)",
    ],
    highlight: "Investors who bring issuer access or regulated-finance counsel.",
  },
  {
    id: "north-star",
    title: "North star",
    bullets: [
      "$100M in independently verified, actively monitored asset value",
      "Credential reuse rate across external protocols",
      "If Abraxas disappeared, lenders would lose reusable trust graph",
    ],
    link: { label: "Data room", href: "/investors" },
  },
];
