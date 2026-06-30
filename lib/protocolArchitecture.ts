// FILE: lib/protocolArchitecture.ts
// Honest technical architecture reference — status labels are deliberate.
// No fabricated program IDs or deployed features.

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
    detail: "The product intent is portable verification — not DeFi intent solvers. A holder presents a credential (or future on-chain passport root) instead of re-uploading documents at every protocol.",
    items: [
      "Passport stamp wizard on /passport (Social, Identity, Business, Asset Owner)",
      "Signed presentation via POST /api/credentials/verify (live API)",
      "On-chain CPI verify instruction — planned after Passport PDA ships",
    ],
  },
  {
    id: "verification",
    layer: "Verification & credentials",
    role: "Trust primitive",
    status: "live",
    detail: "Hybrid model: certified providers and manual review off-chain; cryptographic attestation on-chain and in W3C VCs. Documents are never stored on-chain.",
    items: [
      "W3C Verifiable Credentials Data Model v2.0",
      "Ed25519 signed JWT issuance (POST /api/credentials/issue)",
      "Veriff: government ID + liveness (/passport)",
      "Reclaim Protocol: LinkedIn, X, GitHub, Gmail (zkTLS)",
      "10-stamp passport model (UI + credential mapping live; full stamp set earned per tier)",
      "Planned: Passport PDA per holder with compact stamp bitmap or Merkle root",
    ],
  },
  {
    id: "settlement",
    layer: "Settlement & payments",
    role: "Fee capture for verification + packages",
    status: "in_progress",
    detail: "Stablecoin payments to treasury wallet circuit.skr on Solana mainnet today. x402 HTTP payment flow planned for programmatic verification and package purchase without manual transfer.",
    items: [
      "Live: USDT/USDC manual transfer → circuit.skr with Authorized → Captured → Settled lifecycle",
      "Live: Buy Now / Book Now modals with on-chain verification step",
      "Roadmap: x402 for verification packages ($29 identity, $199+ business/property)",
      "Roadmap: x402 for Wyoming LLC tier intake on /build",
    ],
  },
  {
    id: "execution",
    layer: "Tokenization & ownership",
    role: "On-chain asset record",
    status: "in_progress",
    detail: "Wyoming LLC formation packages include on-chain token mint intent. Ownership structure recorded on Solana for third-party verification. Token standard and mint authority details publish with first external integration.",
    items: [
      "Live: Wyoming LLC tiers (Starter / Growth / Enterprise) with verification bundled",
      "Live: Cielo Sunrise genesis asset — real property, real revenue, AAS-1 verified",
      "In progress: Token-2022 mint path for new asset submissions",
      "Roadmap: Shared account control (Growth tier) — multisig or program-controlled PDA spec",
    ],
  },
  {
    id: "agents",
    layer: "Agent orchestration",
    role: "Pipeline automation",
    status: "roadmap",
    detail: "Agents coordinate verification → review → stamp issuance → credential delivery. Not a generic “agentic modular” marketing layer — scoped to the Abraxas verification and tokenization pipeline.",
    items: [
      "Live: Human verifier review queue for Business, Property, and Asset Owner tiers",
      "Roadmap: Agent-assisted document intake and status updates",
      "Roadmap: Automated stamp issuance trigger after review approval",
    ],
  },
  {
    id: "integrators",
    layer: "Integrator surface",
    role: "Third-party verification",
    status: "in_progress",
    detail: "External protocols should verify a passport without trusting Abraxas off-chain indefinitely. API live today; on-chain CPI is the target for Solana-native programs.",
    items: [
      "Live: POST /api/credentials/verify",
      "Live: GET /api/credentials/public-key",
      "Live: Issuer did:web:abraxas-app.vercel.app",
      "Roadmap: Anchor program + IDL with verify_passport(stamp) instruction",
      "Roadmap: Structured CPI return (stamp set, credential version, timestamp)",
    ],
  },
] as const;

export const X402_ARCHITECTURE = {
  title: "x402 payment path (planned)",
  summary: "HTTP 402 Payment Required for verification packages and /build tier intake — replaces manual “send USDT and wait” with programmatic settlement tied to credential issuance.",
  flow: [
    "Client requests verification package or Wyoming tier → server responds 402 with price + treasury route",
    "Wallet or API client completes stablecoin payment on Solana",
    "Payment proof verified on-chain (tx signature + amount + recipient)",
    "Review queue or self-serve flow unlocked; credential issuance triggered on completion",
  ],
  targets: [
    { use: "Identity Precheck follow-up packages", price: "From $29", status: "roadmap" as const },
    { use: "Business / Property verification tiers", price: "From $199", status: "roadmap" as const },
    { use: "Wyoming LLC Starter / Growth / Enterprise", price: "$1,499 – $4,999", status: "roadmap" as const },
    { use: "Integrator API verification credits", price: "Custom", status: "roadmap" as const },
  ],
  why: "x402 lets Abraxas sell verification as infrastructure — APIs, agents, and external protocols can pay for checks programmatically. That is the settlement layer for the trust primitive, not a separate product category.",
} as const;

export const PASSPORT_ONCHAIN_SPEC = {
  title: "Passport root spec (pre-mainnet)",
  summary: "Chain-agnostic 52-byte Passport root — u16 stamp bitmask, single issuance authority, revocation + expiration. Identical serialization on Solana Anchor PDA and Sui Move object. Full spec: /docs/passport-spec.",
  accountLayout: [
    { field: "version", desc: "u8 — format version (1)" },
    { field: "stamps", desc: "u16 bitmask — 10 gates (see /docs/passport-spec)" },
    { field: "authority", desc: "32 bytes — issuance authority (PDA on Solana, cap on Sui)" },
    { field: "expires_at", desc: "u64 unix seconds — 0 = no expiration" },
    { field: "revoked", desc: "u8 — 0 active, 1 irreversible" },
    { field: "nonce", desc: "u64 — anti-replay, increments on update" },
  ],
  verifyInstruction: [
    "verify_passport(required_stamps) on Solana — CPI-friendly",
    "verify(passport, required_stamps, timestamp) on Sui Move",
    "Type 0: Ed25519 over abraxas-passport-v1 || serialized root (off-chain, no gas)",
    "Type 1: Sui zkLogin ZK presentation (roadmap)",
  ],
  privacy: "Still no documents on-chain. Only cryptographic facts of verification update the passport root.",
} as const;

export const INTEGRATOR_QUICKSTART = {
  steps: [
    "Fetch issuer public key: GET /api/credentials/public-key",
    "Accept presentation JWT from user's Abraxas Passport (COPY CREDENTIAL JSON on /passport)",
    "Verify: POST /api/credentials/verify with credential_jwt and your verifier_id",
    "Check response: verified boolean, level, stamps, expiry",
    "Future: CPI into Abraxas verify program with passport PDA + expected stamp bitmap",
  ],
  endpoints: [
    "POST /api/credentials/verify",
    "GET /api/credentials/public-key",
    "POST /api/credentials/issue",
    "POST /api/identity/veriff/create-session",
    "POST /api/reclaim/start",
  ],
} as const;
