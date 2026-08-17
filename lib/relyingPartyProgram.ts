// FILE: lib/relyingPartyProgram.ts
// Relying party onboarding. how external protocols verify Abraxas credentials.

import { SITE_URL } from "@/lib/siteUrl";
export const RELYING_PARTY_DEFINITION =
  "A relying party is any lender, marketplace, registry, or protocol that accepts an Abraxas credential or Passport state to clear a downstream action without repeating identity verification on the user.";

export const RELYING_PARTY_CHECKLIST = [
  {
    step: 1,
    title: "Choose your trust gate",
    body: "Identity-only (POST /api/credentials/verify), wallet trust (GET /api/trust/status), or asset registry (GET /api/verify/registry).",
  },
  {
    step: 2,
    title: "Test in sandbox",
    body: "When operators provision sandbox credentials, test Partner Flow receipts with operator-provided IDs. Use the public receipt tester only as a mirror of your server-side check. Registry demos (e.g. /verify/ABX-RE-HOSP-001) are separate artifacts.",
  },
  {
    step: 3,
    title: "Implement the gate",
    body: "Call our API server-side. Never trust client-side JWT parsing alone. verify signature via our endpoint or published Ed25519 public key.",
  },
  {
    step: 4,
    title: "Pilot + measure",
    body: "Run a 30-day pilot with a defined metric: time-to-verify, conversion lift, or cost per manual review eliminated.",
  },
] as const;

export const CREDENTIAL_VERIFY_EXAMPLE = `// Server-side: verify → decision + cryptographic proof
const res = await fetch("${SITE_URL}/api/credentials/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abx_live_YOUR_KEY",
  },
  body: JSON.stringify({
    record_id: "ABX-RE-HOSP-001",
    policy_id: "abraxas-verify-v1",
  }),
});

const result = await res.json();
// decision, proof_id, verify_url, authentication_proof, decision_receipt

if (result.decision === "approved") {
  const proof = await fetch(result.verify_url).then(r => r.json());
  if (proof.signature_valid && proof.proof_reliable) {
    // Clear gated action. independently verifiable proof on record
  }
}`;

export const TRUST_STATUS_EXAMPLE = `// Lightweight gate: does this Sui wallet have an Abraxas account + ID?
const res = await fetch(
  \`${SITE_URL}/api/trust/status?sui=\${walletAddress}\`
);
const trust = await res.json();

if (trust.enhanced_trust) {
  // ID verified + active credential
} else if (trust.ready_to_transact) {
  // Account exists. optional ID for your risk tier
}`;

export const REGISTRY_VERIFY_EXAMPLE = `// Verify an asset or Passport DID in the public registry
const res = await fetch(
  \`${SITE_URL}/api/verify/registry?q=\${encodeURIComponent(identifier)}\`
);
const state = await res.json();

if (state.state === "RESOLVED_VALID" && state.assurance_level >= 3) {
  // L3+ attested. suitable for collateral decisions
}`;

export const RELYING_PARTY_LIMITATIONS = [
  "Abraxas credentials attest to verification state. they are not investment advice or securities approvals.",
  "Relying parties must define their own risk tier mapping (which assurance level clears which action).",
  "Passport reuse on Abraxas today; external partner acceptance expands as design partners come online.",
  "Revoked or expired credentials must fail closed. always check state at transaction time, not cache indefinitely.",
] as const;

export const DESIGN_PARTNER_SLOTS = [
  { category: "RWA marketplace", need: "Investor eligibility gate without re-KYC", api: "POST /api/credentials/verify" },
  { category: "Private credit / lending", need: "Collateral + identity tier for borrow", api: "GET /api/verify/registry" },
  { category: "Music / IP platform", need: "Catalog ownership attestation", api: "GET /api/verify/registry" },
  { category: "Regulated retail (cannabis)", need: "Age-gated Passport + batch COA provenance", api: "POST /api/credentials/verify" },
  { category: "Corporate registry", need: "Wyoming LLC + asset binding check", api: "GET /api/trust/status" },
] as const;

export const ASSET_SIGNAL_WEBHOOK_EXAMPLE = `// Partner webhook. report lot status change (MLS sync)
const res = await fetch("${SITE_URL}/api/v1/listings/lot-status", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abx_live_YOUR_KEY",
  },
  body: JSON.stringify({
    asset_id: "ABX-RE-LAND-006",
    idempotency_key: "cpg:2026-07-18:lot4",
    lots: [
      { lot: 4, status: "under_contract", notes: "MLS offer accepted" },
    ],
  }),
});

const result = await res.json();
// { ok: true, fingerprint, changed, results[] }

// Or via asset-signals with credential review:
await fetch("${SITE_URL}/api/v1/asset-signals", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abx_live_YOUR_KEY",
  },
  body: JSON.stringify({
    asset_id: "ABX-RE-LAND-006",
    signal_type: "listing_status_change",
    apply: true,
    lots: [{ lot: 4, status: "under_contract" }],
  }),
});`;

export const PRODUCTION_INTEGRATION_PATH = [
  "Read /docs/relying-party-verify — one verify call, proof, independent check",
  "Operators may issue production API credentials after approval and conformance — not via a self-serve dashboard",
  "Implement server-side POST /api/credentials/verify at your transaction gate",
  "Confirm GET /api/proof/{proof_id} returns signature_valid: true",
  "First approved production verify logs toward the external RP mainnet gate",
] as const;
