// FILE: lib/relyingPartyProgram.ts
// Relying party onboarding — how external protocols verify Abraxas credentials.

export const RELYING_PARTY_DEFINITION =
  "A relying party is any lender, marketplace, registry, or protocol that accepts an Abraxas credential or Passport state to clear a downstream action — without re-running KYC on the user.";

export const RELYING_PARTY_CHECKLIST = [
  {
    step: 1,
    title: "Choose your trust gate",
    body: "Identity-only (POST /api/credentials/verify), wallet trust (GET /api/trust/status), or asset registry (GET /api/verify/registry).",
  },
  {
    step: 2,
    title: "Test in sandbox",
    body: "Use a devnet Passport or paste ABX-RE-HOSP-001 in /verify. Confirm RESOLVED_VALID before wiring production gates.",
  },
  {
    step: 3,
    title: "Implement the gate",
    body: "Call our API server-side. Never trust client-side JWT parsing alone — verify signature via our endpoint or published Ed25519 public key.",
  },
  {
    step: 4,
    title: "Pilot + measure",
    body: "Run a 30-day pilot with a defined metric: time-to-verify, conversion lift, or cost per manual review eliminated.",
  },
] as const;

export const CREDENTIAL_VERIFY_EXAMPLE = `// Server-side: verify a user's Abraxas credential before checkout
const res = await fetch("https://abraxas-app.vercel.app/api/credentials/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    credential_jwt: userPresentationJwt,
    verifier_id: "your_protocol_name",
    required_claims: ["jurisdiction", "verification_level"],
  }),
});

const result = await res.json();
if (result.verified && result.verification_level === "enhanced") {
  // Clear regulated flow — user already ID-verified via Abraxas
}`;

export const TRUST_STATUS_EXAMPLE = `// Lightweight gate: does this Sui wallet have an Abraxas account + ID?
const res = await fetch(
  \`https://abraxas-app.vercel.app/api/trust/status?sui=\${walletAddress}\`
);
const trust = await res.json();

if (trust.enhanced_trust) {
  // ID verified + active credential
} else if (trust.ready_to_transact) {
  // Account exists — optional ID for your risk tier
}`;

export const REGISTRY_VERIFY_EXAMPLE = `// Verify an asset or Passport DID in the public registry
const res = await fetch(
  \`https://abraxas-app.vercel.app/api/verify/registry?q=\${encodeURIComponent(identifier)}\`
);
const state = await res.json();

if (state.state === "RESOLVED_VALID" && state.assurance_level >= 3) {
  // L3+ attested — suitable for collateral decisions
}`;

export const RELYING_PARTY_LIMITATIONS = [
  "Abraxas credentials attest to verification state — they are not investment advice or securities approvals.",
  "Relying parties must define their own risk tier mapping (which assurance level clears which action).",
  "Passport reuse on Abraxas today; external partner acceptance expands as design partners come online.",
  "Revoked or expired credentials must fail closed — always check state at transaction time, not cache indefinitely.",
] as const;

export const DESIGN_PARTNER_SLOTS = [
  { category: "RWA marketplace", need: "Investor eligibility gate without re-KYC", api: "POST /api/credentials/verify" },
  { category: "Private credit / lending", need: "Collateral + identity tier for borrow", api: "GET /api/verify/registry" },
  { category: "Music / IP platform", need: "Catalog ownership attestation", api: "GET /api/verify/registry" },
  { category: "Corporate registry", need: "Wyoming LLC + asset binding check", api: "GET /api/trust/status" },
] as const;
