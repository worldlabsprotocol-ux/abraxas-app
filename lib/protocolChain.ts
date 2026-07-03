// FILE: lib/protocolChain.ts
// Public chain narrative — intentional split, not scattered execution.

export const CHAIN_NARRATIVE = {
  headline: "Sui for trust. Solana for treasury token.",
  summary:
    "Abraxas runs verification, identity, passports, and stablecoin booking on Sui. $ABRA is an optional SPL treasury and access token on Solana. Each chain does what it is best at.",
  layers: [
    {
      chain: "Sui",
      role: "Trust & transaction layer",
      live: [
        "Google zkLogin → deterministic wallet (no seed phrase)",
        "Verifiable Credentials (W3C VC, did:sui)",
        "Move Passport stamp bitmask (devnet live, mainnet next)",
        "USDC booking & payment for Cielo Sunrise",
        "Intent message proofs for integrators",
        "Sponsored transaction treasury (roadmap)",
      ],
      why: "Low-cost state updates, zkLogin UX, and personal-message proofs make consumer onboarding and reusable credentials practical.",
    },
    {
      chain: "Solana",
      role: "Treasury & optional access token",
      live: [
        "$ABRA fair launch via Bags.fm (SPL Token-2022)",
        "Fee tier discounts for holders (Initiate → Sovereign)",
        "Public on-chain holder verification via Solscan",
      ],
      why: "Liquid public market for protocol access tiers and treasury alignment without gating verification on /passport.",
    },
  ],
  notClaims: [
    "Verification is not gated by $ABRA — sign in with Google on Sui.",
    "Sensitive identity documents never anchor on-chain — only consented proofs and attestations.",
    "Multi-chain is intentional architecture, not a pivot in progress.",
  ],
  custody: {
    headline: "Who holds what",
    rows: [
      { item: "Identity documents", holder: "Licensed provider (Veriff)", abraxas: "Outcome only" },
      { item: "User wallet keys (zkLogin)", holder: "Google OAuth + server salt", abraxas: "Derived address" },
      { item: "Booking payments (USDC)", holder: "Protocol treasury on Sui", abraxas: "Orchestrates + verifies" },
      { item: "Asset legal title", holder: "Property SPV / owner entity", abraxas: "Attestation layer" },
      { item: "$ABRA token", holder: "User wallets on Solana", abraxas: "Optional utility" },
    ],
  },
} as const;
