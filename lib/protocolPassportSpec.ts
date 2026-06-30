// FILE: lib/protocolPassportSpec.ts
// Shared copy for /docs/passport-spec — chain-agnostic Passport root.

export const PASSPORT_SPEC_INTRO =
  "Sui-native Abraxas Passport specification. Same 52-byte logical state on Sui Move objects. zkLogin (Google OAuth) derives holder addresses; documents stay off-chain — only stamp bitmask + authority + lifecycle fields are on-chain.";

export const STAMP_BIT_TABLE = [
  { bit: 0, id: "identity", label: "Identity Verified" },
  { bit: 1, id: "biometric", label: "Biometrics Confirmed" },
  { bit: 2, id: "business", label: "Business Verified" },
  { bit: 3, id: "owner", label: "Asset Owner Verified" },
  { bit: 4, id: "royalty", label: "Royalty Rights Verified" },
  { bit: 5, id: "property", label: "Property Owner Verified" },
  { bit: 6, id: "tribal", label: "Tribal Partner Verified" },
  { bit: 7, id: "compliance", label: "Compliance Cleared" },
  { bit: 8, id: "lending", label: "Lending Eligible" },
  { bit: 9, id: "social", label: "Social Verified (deprecated — not used)" },
] as const;

export const IMPLEMENTATION_ORDER = [
  "zkLogin sign-in on /passport (Google OAuth → Sui address)",
  "Veriff off-chain review → W3C credential with did:sui",
  "issue_stamps on Sui Passport object after each approved stamp",
  "Sponsored transactions + proving service for user-initiated on-chain updates",
  "Mainnet deployment + public verify API for integrators",
] as const;

export const ZKLOGIN_INTEGRATION = {
  summary:
    "Sui zkLogin lets users derive a Sui address from OAuth (Google, Apple, etc.) without linking identity on-chain. Abraxas uses it for low-friction onboarding while keeping the Passport root chain-agnostic.",
  flow: [
    "App generates ephemeral key pair; embeds public key in OAuth nonce",
    "User completes OAuth; JWT returned with nonce",
    "Proving service generates ZK proof (identity not revealed on-chain)",
    "Sui address derived from sub + iss + aud + user_salt via jwtToAddress",
    "Off-chain review completes → issue_stamps on Sui Passport object",
    "Optional: mirror same stamp bitmask to Sui Passport object",
    "Presentation: Type 0 Ed25519 signature (gas-free personal message) or Type 1 ZK proof",
  ],
  gasNotes: [
    "signPersonalMessage — off-chain intent scope PersonalMessage (3,0,0), no gas",
    "Gasless USDC transfers on Sui — allowlisted stablecoins only, not general Move calls",
    "Sponsored transactions — sponsor pays gas for full on-chain passport updates",
  ],
  links: [
    { label: "Sui zkLogin overview", href: "https://docs.sui.io/concepts/cryptography/zklogin" },
    { label: "zkLogin SDK (jwtToAddress)", href: "https://sdk.mystenlabs.com/sui/zklogin" },
    { label: "Intent signing", href: "https://docs.sui.io/concepts/cryptography/transaction-auth/intent-signing" },
    { label: "Gasless stablecoin transfers", href: "https://docs.sui.io/concepts/tokenomics/gas-in-sui" },
  ],
} as const;

export const PROOF_TYPES = [
  {
    type: "0 — Ed25519 signature",
    status: "spec ready",
    detail: "Sign domain || serialized_52_byte_root with issuance authority key. Lowest complexity; works off-chain with no gas.",
  },
  {
    type: "1 — ZK presentation (zkLogin)",
    status: "roadmap",
    detail: "Proves holder controls a valid zkLogin-derived address linked to passport root without revealing OAuth credentials.",
  },
] as const;
