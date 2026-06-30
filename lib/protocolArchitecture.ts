// FILE: lib/protocolArchitecture.ts
// Honest technical architecture reference — Sui-native verification.

export type ArchStatus = "live" | "in_progress" | "roadmap";

export interface ArchLayer {
  id: string;
  layer: string;
  role: string;
  status: ArchStatus;
  detail: string;
  items?: readonly string[];
}

export const ARCH_STATUS_META: Record<ArchStatus, { label: string; color: string }> = {
  live:         { label: "Live",         color: "#10B981" },
  in_progress:  { label: "In progress",  color: "#F59E0B" },
  roadmap:      { label: "Roadmap",      color: "#3B82F6" },
};

export const ARCHITECTURE_LAYERS: readonly ArchLayer[] = [
  {
    id: "intent",
    layer: "User intent",
    role: "Verify once · use everywhere",
    status: "in_progress",
    detail: "Portable verification on Sui — zkLogin for identity, personal-message intents for gas-free proofs, sponsored transactions for tier members updating Passport stamps.",
    items: [
      "zkLogin sign-in on /passport (Google → Sui address)",
      "Intent messaging: sign challenge strings without a transaction (roadmap)",
      "Sponsored tx tiers: growth-fee treasury pays gas for stamp ops (roadmap)",
      "Signed presentation via POST /api/credentials/verify (live)",
    ],
  },
  {
    id: "verification",
    layer: "Credential engine (AIL L2)",
    role: "Trust orchestration",
    status: "live",
    detail: "Licensed providers verify off-chain; Abraxas issues W3C credentials (did:sui) and records only hashes, issuer, expiration, sanctions status, wallet binding. Sui Move Passport anchors stamp bitmask on-chain.",
    items: [
      "W3C Verifiable Credentials (did:sui:0x…)",
      "Ed25519 signed JWT issuance (POST /api/credentials/issue)",
      "Veriff Precheck on /passport (linked to zkLogin address)",
      "Sui Passport Move module — devnet live (GET /api/sui/passport)",
      "10-stamp bitmask model",
    ],
  },
  {
    id: "settlement",
    layer: "Settlement & payments",
    role: "Fees → sponsor treasury",
    status: "in_progress",
    detail: "Stablecoin checkout for packages and bookings. A slice of verification growth fees funds the Sui sponsor treasury for tier-based gas sponsorship.",
    items: [
      "Live: stablecoin transfer → treasury with Authorized → Captured → Settled",
      "Roadmap: x402 for verification packages",
      "Roadmap: automatic allocation to SUI_SPONSOR_TREASURY_ADDRESS",
    ],
  },
  {
    id: "execution",
    layer: "Tokenization & ownership",
    role: "Verified asset record",
    status: "in_progress",
    detail: "Wyoming LLC packages and verified assets (Cielo Sunrise) with Abraxas verification pipeline. Ownership credentials tied to Sui holder address.",
    items: [
      "Wyoming LLC tiers on /build",
      "Cielo Sunrise genesis asset — live gallery + booking",
      "Asset submissions via V5 pipeline",
    ],
  },
  {
    id: "agents",
    layer: "Agent orchestration",
    role: "Pipeline automation",
    status: "roadmap",
    detail: "Agents coordinate verification → review → stamp issuance → credential + on-chain mirror.",
    items: [
      "Live: Human verifier queue for Business, Property, Asset Owner",
      "Roadmap: Auto issue_stamps on Sui after approval",
    ],
  },
  {
    id: "integrators",
    layer: "Integrator surface",
    role: "Third-party verification",
    status: "in_progress",
    detail: "Verify without re-KYC: JWT API today, on-chain bitmask read via Sui RPC tomorrow.",
    items: [
      "Live: POST /api/credentials/verify",
      "Live: GET /api/sui/passport",
      "Live: GET /api/credentials/public-key",
      "Roadmap: Intent message verification SDK",
    ],
  },
] as const;

export const X402_ARCHITECTURE = {
  title: "x402 payment path (planned)",
  summary: "HTTP 402 for verification packages — programmatic settlement tied to credential + Passport stamp issuance.",
  flow: [
    "Client requests package → server responds 402 with price",
    "Payment completed (stablecoin or Sui)",
    "Portion allocated to sponsor treasury",
    "Review unlocked; credential + on-chain stamps issued",
  ],
  targets: [
    { use: "Identity Precheck packages", price: "From $29", status: "roadmap" as const },
    { use: "Business / Property tiers", price: "From $199", status: "roadmap" as const },
    { use: "Wyoming LLC tiers", price: "$1,499 – $4,999", status: "roadmap" as const },
  ],
  why: "x402 sells verification as infrastructure — APIs and agents pay programmatically.",
} as const;

export const PASSPORT_ONCHAIN_SPEC = {
  title: "Passport root (Sui primary)",
  summary: "52-byte logical root — u16 stamp bitmask on Sui Move Passport object. zkLogin holder address. Full spec: /docs/passport-spec · hub: /docs/sui.",
  accountLayout: [
    { field: "version", desc: "u8 — format version (1)" },
    { field: "stamps", desc: "u16 bitmask — 10 gates" },
    { field: "authority", desc: "32 bytes — issuance cap authority on Sui" },
    { field: "expires_at", desc: "u64 unix seconds — 0 = none" },
    { field: "revoked", desc: "u8 — 0 active, 1 revoked" },
    { field: "nonce", desc: "u64 — increments on stamp update" },
  ],
  verifyInstruction: [
    "verify(passport, required_stamps, timestamp) on Sui Move",
    "GET /api/sui/passport for off-chain integrators",
    "Type 0: Ed25519 over abraxas-passport-v1 || serialized root",
    "Type 1: zkLogin ZK presentation",
    "Intent: personal message sign (no gas)",
  ],
  privacy: "No documents on-chain — only stamp bitmask and lifecycle fields.",
} as const;

export const INTEGRATOR_QUICKSTART = {
  steps: [
    "Fetch issuer public key: GET /api/credentials/public-key",
    "Accept presentation JWT (did:sui) from user's Passport",
    "Verify: POST /api/credentials/verify",
    "Optional: GET /api/sui/passport?owner=0x… for on-chain stamps",
    "Learn features: /docs/sui",
  ],
  endpoints: [
    "POST /api/auth/zklogin/register",
    "GET /api/sui/passport",
    "POST /api/credentials/verify",
    "GET /api/credentials/public-key",
    "GET /api/passport/spec",
  ],
} as const;
