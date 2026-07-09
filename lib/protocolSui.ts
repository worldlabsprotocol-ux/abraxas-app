// FILE: lib/protocolSui.ts
// Single source for Sui-native verification UX copy. zkLogin, sponsored tx, intents.

export const SUI_VERIFICATION_TAGLINE =
  "Verify once on Sui. zkLogin identity, on-chain Passport stamps, sponsored transactions for verified members.";

export const SUI_FEATURES = [
  {
    id: "zklogin",
    title: "zkLogin (Google → Sui address)",
    status: "live" as const,
    summary:
      "No seed phrase. Sign in with Google; Abraxas derives a Sui holder address. Same account always maps to the same address.",
    userSteps: [
      "Go to /passport → Continue with Google",
      "Complete OAuth → land back with your Sui address",
      "Address is stored in sui_zklogin_identities (Supabase)",
    ],
    links: [
      { label: "Get verified", href: "/passport" },
      { label: "Setup guide", href: "/docs/zklogin-setup" },
      { label: "Sui zkLogin docs", href: "https://docs.sui.io/concepts/cryptography/zklogin", external: true },
    ],
  },
  {
    id: "passport-object",
    title: "On-chain Passport (Move)",
    status: "devnet" as const,
    summary:
      "52-byte stamp bitmask on a Sui Passport object. identity, biometric, business, and seven other gates. Readable via GET /api/sui/passport.",
    userSteps: [
      "Earn stamps off-chain (Veriff, manual review)",
      "Backend issues stamps on Sui after approval (Step 6 in setup guide)",
      "Anyone can verify bitmask on-chain without trusting Abraxas UI",
    ],
    links: [
      { label: "Live devnet panel", href: "/docs/passport-spec#sui-devnet" },
      { label: "Passport spec", href: "/docs/passport-spec" },
      { label: "Query API", href: "/api/sui/passport" },
    ],
  },
  {
    id: "sponsored-tx",
    title: "Sponsored transactions",
    status: "roadmap" as const,
    summary:
      "Verified Passport tiers get gas-free Sui actions (stamp updates, credential anchoring). Funded by a small growth fee into the Abraxas sponsor treasury.",
    userSteps: [
      "Earn Passport stamps → unlock a tier (Basic → Elite)",
      "Sponsor pool pays gas for allowed actions (no SUI in your wallet needed)",
      "Treasury refilled from a micro-fee on verification packages & platform growth",
    ],
    links: [
      { label: "Tier table below", href: "/docs/sui#sponsored" },
      { label: "Passport tiers", href: "/passport" },
    ],
  },
  {
    id: "intent-messaging",
    title: "Intent messaging (personal message proofs)",
    status: "live" as const,
    summary:
      "Prove you control your Sui identity by signing a short message. no transaction, no gas. Integrators verify the signature against your Passport root.",
    userSteps: [
      "Request a challenge string from an integrator (or Abraxas API)",
      "Sign with zkLogin-derived key (wallet-free)",
      "Verifier checks Ed25519 or zkLogin proof against did:sui address",
    ],
    links: [
      { label: "Proof types", href: "/docs/passport-spec" },
      { label: "Credential verify API", href: "/api/credentials/public-key" },
    ],
  },
  {
    id: "w3c-credentials",
    title: "W3C credentials (did:sui)",
    status: "live" as const,
    summary:
      "After Veriff approves, Abraxas issues a signed JWT. Subject is did:sui:0x…. portable across integrators.",
    userSteps: [
      "Complete identity stamp on /passport",
      "Veriff webhook → POST /api/idv/webhook → credential issued",
      "Integrators call POST /api/credentials/verify",
    ],
    links: [
      { label: "Public issuer key", href: "/api/credentials/public-key" },
      { label: "Machine spec", href: "/api/passport/spec" },
    ],
  },
] as const;

/** Sponsored transaction allowances by Passport trust tier (planned). */
export const SPONSORED_TX_TIERS = [
  {
    tier: "Unverified",
    stamps: "0",
    sponsoredActionsPerMonth: 0,
    includes: ["Sign in with zkLogin only"],
  },
  {
    tier: "Basic",
    stamps: "1–2",
    sponsoredActionsPerMonth: 3,
    includes: ["Passport stamp read", "Intent message sign (1×)"],
  },
  {
    tier: "Verified",
    stamps: "3–5",
    sponsoredActionsPerMonth: 10,
    includes: ["Stamp update (sponsored)", "Intent proofs", "Credential refresh"],
  },
  {
    tier: "Trusted",
    stamps: "6–8",
    sponsoredActionsPerMonth: 25,
    includes: ["All Verified perks", "Priority sponsor queue"],
  },
  {
    tier: "Elite",
    stamps: "9–10",
    sponsoredActionsPerMonth: -1,
    includes: ["Unlimited sponsored passport ops", "Early mainnet features"],
  },
] as const;

export const SPONSOR_TREASURY_MODEL = {
  summary:
    "A small fee on verification growth (packages, premium stamps, partner referrals) flows to a Sui sponsor treasury. That pool pays gas for tier-eligible Passport actions so users never need devnet/mainnet SUI to get verified.",
  feeExamples: [
    "Verification package checkout → 2% to sponsor treasury",
    "Founding Verified / genesis seats → flat SUI allocation to pool",
    "Partner-referred verifications → shared sponsor rebate",
  ],
  treasuryEnvKey: "SUI_SPONSOR_TREASURY_ADDRESS",
  note: "Treasury address and automated sponsor API ship with mainnet Passport issuance.",
};

export const SETUP_CHECKLIST = [
  { step: 1, label: "Google OAuth + zkLogin", href: "/docs/zklogin-setup", doneWhen: "Row in sui_zklogin_identities" },
  { step: 2, label: "Supabase SQL", href: "/docs/zklogin-setup", doneWhen: "Tables created" },
  { step: 3, label: "Veriff webhook", href: "/docs/zklogin-setup", doneWhen: "did:sui credential after ID scan" },
  { step: 4, label: "Signing keys", href: "/docs/zklogin-setup", doneWhen: "ABRAXAS_SIGNING_KEY in Vercel" },
  { step: 5, label: "On-chain stamps API", href: "/docs/sui#sponsored", doneWhen: "sui_passport_objects populated" },
] as const;
