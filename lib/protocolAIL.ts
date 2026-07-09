// FILE: lib/protocolAIL.ts
// Abraxas Identity Layer (AIL). product & technical specification.
// Single source for vision, architecture, and integrator contract.

export const AIL_NAME = "Abraxas Identity Layer";
export const AIL_SHORT = "AIL";
export const AIL_TAGLINE = "Verify Once. Transact Everywhere.";
export const AIL_POSITIONING =
  "Universal Trust Infrastructure for Tokenized Assets and Digital Identity";

export const AIL_ELEVATOR =
  "Abraxas is not a KYC provider. It is a trust and credential orchestration layer. licensed verifiers perform KYC; Abraxas standardizes, secures, and distributes cryptographic proof with user consent.";

export const AIL_PROBLEM =
  "Every exchange, protocol, RWA platform, and lender performs KYC independently because each is legally responsible for it. They do not trust each other's verification, and there is no universal trust framework.";

export const AIL_SOLUTION =
  "Complete verification once with an approved provider. Receive a signed W3C Verifiable Credential bound to your wallet. Abraxas records only proofs. never passports or selfies. When another protocol needs compliance, it asks Abraxas for a signed answer instead of making the user upload documents again.";

export const CORE_PRINCIPLES = [
  "Users own their identity credentials",
  "No passports or driver's licenses stored on-chain",
  "PII remains with approved identity providers (Veriff, manual review)",
  "On-chain: hashes, issuer attestations, timestamps, expiration, revocation status only",
  "Every credential is cryptographically signed (W3C VC · Ed25519)",
  "Every credential is revocable",
  "Every verification is portable across participating protocols",
  "User consent required before any proof is shared",
] as const;

/** What Abraxas records. never raw documents */
export const AIL_STORED_FIELDS = [
  { field: "credential_hash", desc: "SHA-256 of the VC payload. tamper-evident reference" },
  { field: "issuer", desc: "Licensed verifier or Abraxas attestation key (did:web:…)" },
  { field: "wallet_binding", desc: "Sui address (zkLogin). primary holder anchor" },
  { field: "expiration", desc: "Credential and stamp TTL; 0 = no expiry until policy change" },
  { field: "risk_score", desc: "Dynamic 0–1000 trust score (roadmap)" },
  { field: "sanctions_status", desc: "AML / OFAC screening outcome from provider" },
  { field: "verification_level", desc: "BASIC · STANDARD · ENHANCED · ELITE stamp set" },
  { field: "revocation_status", desc: "Active · revoked · superseded" },
] as const;

/** Questions integrators ask Abraxas instead of re-running KYC */
export const INTEGRATOR_QUERIES = [
  { q: "Is this wallet verified?", api: "GET /api/sui/passport?owner=0x… · POST /api/credentials/verify" },
  { q: "Is the credential still valid?", api: "Check expiration + revocation + issuer signature" },
  { q: "Is this user eligible for US investors?", api: "Compliance engine. jurisdiction rules (roadmap)" },
  { q: "Has AML screening passed?", api: "Stamp bitmask + sanctions_status in credential subject" },
  { q: "Which issuer performed KYC?", api: "issuer field + trusted issuer registry (roadmap)" },
  { q: "Can I trust this attestation?", api: "Ed25519 verify against GET /api/credentials/public-key" },
] as const;

export type AILLayerStatus = "live" | "in_progress" | "roadmap";

export interface AILLayer {
  id: string;
  layer: string;
  status: AILLayerStatus;
  summary: string;
  responsibilities: readonly string[];
  output?: string;
}

export const AIL_ARCHITECTURE_LAYERS: readonly AILLayer[] = [
  {
    id: "providers",
    layer: "Layer 1. Identity providers",
    status: "live",
    summary: "Licensed third parties perform verification. Abraxas does not replace their legal role.",
    responsibilities: [
      "Government ID + liveness (Veriff. live on /passport)",
      "AML / sanctions screening (via Veriff outcome)",
      "Business / property / asset manual review (Abraxas verifier queue)",
      "Future: Persona, Sumsub, Trulioo, Parallel Markets (trusted issuer registry)",
    ],
    output: "Signed W3C Verifiable Credential to user's wallet",
  },
  {
    id: "credential-engine",
    layer: "Layer 2. Credential engine",
    status: "live",
    summary: "Validates provider outcomes, issues Abraxas-signed JWTs, tracks lifecycle.",
    responsibilities: [
      "Validate signatures · create credential hashes",
      "POST /api/credentials/issue · POST /api/credentials/verify (live)",
      "Track expiration · revocation · credential identifiers",
      "Encrypt off-chain metadata where required",
    ],
    output: "did:sui credential + stamp bitmask reference",
  },
  {
    id: "trust-registry",
    layer: "Layer 3. Trust registry",
    status: "in_progress",
    summary: "Who can issue, what was revoked, issuer reputation. the Stripe-of-trust registry.",
    responsibilities: [
      "Trusted issuer registry (roadmap)",
      "Credential registry + revocation registry (partial. Supabase + on-chain revoke bit)",
      "Issuer licensing metadata · supported jurisdictions (roadmap)",
      "Institution reputation scores (roadmap)",
    ],
    output: "Integrators trust one registry instead of five KYC vendors",
  },
  {
    id: "compliance-engine",
    layer: "Layer 4. Compliance engine",
    status: "roadmap",
    summary: "Policy evaluation. PASS / FAIL / REVIEW for institution-specific rules.",
    responsibilities: [
      "Jurisdiction eligibility · accredited investor rules",
      "Credential freshness (e.g. KYC within 12 months)",
      "Sanctions re-screening · Travel Rule hooks",
      "Institution-defined policy DSL",
    ],
    output: "Signed compliance proof without exposing underlying PII",
  },
  {
    id: "identity-wallet",
    layer: "Layer 5. Identity wallet (Passport)",
    status: "live",
    summary: "User-facing credential container. proofs only, no sensitive documents.",
    responsibilities: [
      "zkLogin sign-in → Sui holder address (live)",
      "Sui Move Passport object. stamp bitmask (devnet live)",
      "Multi-wallet binding + recovery (roadmap)",
      "Cross-chain identifiers (roadmap. Sui primary today)",
    ],
    output: "Abraxas Passport. reusable credentials for every participating protocol",
  },
] as const;

export const CREDENTIAL_CATALOG = [
  { category: "Identity", examples: ["KYC", "Biometric", "Proof of address", "Humanity verification"] },
  { category: "Business", examples: ["KYB", "Beneficial ownership", "Institutional investor", "Fund manager"] },
  { category: "Financial", examples: ["Accredited investor", "Income verification", "AML cleared", "Sanctions clear"] },
  { category: "Assets", examples: ["Real estate ownership", "Precious metals", "IP / royalties", "Mineral rights"] },
  { category: "Professional", examples: ["Professional licenses", "University degrees", "Auditor", "Appraiser", "Custodian"] },
  { category: "Sovereign", examples: ["Tribal credentials", "Government agency attestation"] },
] as const;

export const IDENTITY_LIFECYCLE = [
  { phase: "Initial verification", status: "live" as const },
  { phase: "Credential renewal", status: "roadmap" as const },
  { phase: "Periodic AML / sanctions rescreening", status: "roadmap" as const },
  { phase: "Wallet migration (multi-wallet binding)", status: "roadmap" as const },
  { phase: "Credential expiration", status: "live" as const },
  { phase: "Credential revocation", status: "in_progress" as const },
  { phase: "Lost wallet recovery", status: "roadmap" as const },
  { phase: "Audit trail (consent + proof requests)", status: "roadmap" as const },
] as const;

export const ROLE_CREDENTIALS = [
  "Individual", "Business (KYB)", "Institutional investor", "Fund manager",
  "Property owner", "Custodian", "Auditor", "Appraiser", "Trustee", "Government agency",
] as const;

export const DEVELOPER_API = {
  live: [
    "POST /api/credentials/verify",
    "POST /api/credentials/issue",
    "GET /api/credentials/public-key",
    "GET /api/sui/passport",
    "POST /api/auth/zklogin/register",
    "POST /api/idv/create-session",
  ],
  roadmap: [
    "POST /verify · GET /proof · POST /consent · POST /revoke · POST /refresh",
    "GET /trust-score · GET /credential/status · POST /wallet/link",
    "GET /issuer · GET /supported-jurisdictions",
    "Webhooks · policy engine · enterprise dashboard",
  ],
} as const;

export const TRUST_SCORE_FACTORS = [
  "Identity strength", "Credential freshness", "Verification history",
  "Institutional attestations", "Wallet age", "Credential diversity",
  "Sanctions history", "Humanity verification",
] as const;

export const PRIVACY_BY_DESIGN = [
  "PII stays with identity provider whenever possible",
  "Selective disclosure. reveal only what the request requires (zk roadmap)",
  "On-chain: stamp bitmask + hashes. never document images",
  "User consent before every proof share",
  "Encrypted off-chain metadata where Abraxas must store references",
] as const;

export const REVENUE_STREAMS = [
  "Verification orchestration fees",
  "Credential refresh & rescreening",
  "Institution / enterprise subscriptions",
  "Trust Score API",
  "Compliance automation & white-label infrastructure",
  "API usage · premium analytics",
] as const;
