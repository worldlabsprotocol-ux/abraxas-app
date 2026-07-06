// FILE: lib/kycThesis.ts
// Market-facing thesis: why unified KYC is hard + how Abraxas solves it.

export const KYC_DEBT_HEADLINE = "Verification debt is the hidden tax on every RWA deal.";

export const KYC_BARRIERS = [
  {
    title: "Regulatory fragmentation",
    body: "Different counterparties and jurisdictions expect different KYC/AML standards. Issuing a credential others can trust creates liability questions most teams avoid.",
  },
  {
    title: "Privacy requirements",
    body: "Raw identity documents cannot live on public chains. Solutions must keep PII off-chain while still providing cryptographic proof.",
  },
  {
    title: "Wallet friction",
    body: "Seed phrases and extensions block normal users. Adding KYC on top of bad wallet UX killed adoption for years.",
  },
  {
    title: "No portable standards",
    body: "Even when verification happened, proof usually only worked inside one platform — not across lenders, marketplaces, and protocols.",
  },
  {
    title: "Enforcement gap",
    body: "Many systems issue claims but few protocols check them at the moment of action — booking, transfer, lending.",
  },
  {
    title: "Economic reality",
    body: "Building the verification layer is expensive. Most RWA projects prioritized tokenization first and treated KYC as downstream.",
  },
] as const;

export const ABRAXAS_SOLUTION_STEPS = [
  {
    step: "1",
    title: "Seamless identity creation",
    body: "Sign in with Google. Sui zkLogin creates a persistent did:sui address — no seed phrase, no browser extension.",
  },
  {
    step: "2",
    title: "Optional, tiered verification",
    body: "Browse the registry without ID checks. When a deal needs enhanced trust, optional Veriff IDV runs through a licensed provider. Abraxas stores only the outcome.",
  },
  {
    step: "3",
    title: "Portable credential issuance",
    body: "W3C Verifiable Credential as an Ed25519-signed JWT. Structured claims about identity and assets with assurance levels L1–L4.",
  },
  {
    step: "4",
    title: "On-chain anchoring & public verify",
    body: "Credential status anchors on Sui. Anyone can verify via /verify or POST /api/credentials/verify without seeing raw documents.",
  },
  {
    step: "5",
    title: "Revocation & lifecycle",
    body: "Credentials can be revoked. Individual claims refresh (new appraisal, booking data) without re-running full KYC.",
  },
  {
    step: "6",
    title: "Real on-chain actions",
    body: "Book Cielo Sunrise: zkLogin → credential check → USDC on Sui. Verify once, transact — not just a tagline.",
  },
] as const;

export const HYBRID_ARCHITECTURE_SUMMARY =
  "Verification and booking run on modern identity rails. Optional token tiers live separately — your passport is never gated by holdings.";

export const UNIFIED_EXPERIENCE_PRINCIPLES = [
  "I am verified once in Abraxas.",
  "I browse and book real assets without managing a crypto wallet.",
  "When I pay, I use Apple Pay or my card — the rate is shown upfront.",
  "My verified status travels with me across partners.",
] as const;
