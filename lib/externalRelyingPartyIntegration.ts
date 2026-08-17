// FILE: lib/externalRelyingPartyIntegration.ts
// Minimal external relying party path: verify → proof → independent check.
// Hand this module to a real external integrator — one main call, optional proof lookup.

import { DEFAULT_POLICY_ID } from "@/lib/partner/partnerDecision";
import { getSdkDefaultBaseUrl } from "@/lib/app/publicAppOrigin";
import { PARTNER_APPLICATION_PATH } from "@/lib/integrate/partnerJourney";

export const EXTERNAL_RP_BASE_URL = getSdkDefaultBaseUrl();

export const EXTERNAL_RP_HEADLINE =
  "One API call to verify. A cryptographic proof anyone can check.";

export const EXTERNAL_RP_SUMMARY = {
  whatTheyDo: [
    `Apply at ${PARTNER_APPLICATION_PATH} for manual review — operators may provision API credentials after approval`,
    "Call POST /api/credentials/verify server-side at your transaction gate",
    "Gate on decision === \"approved\" (or handle denied / manual_review)",
    "Optionally GET /api/proof/{proof_id} to independently confirm signature_valid === true",
  ],
  whatTheyGetBack: [
    "decision — approved | denied | manual_review",
    "proof_id — durable lookup key (aprx_…)",
    "verify_url — absolute URL to GET /api/proof/{proof_id}",
    "authentication_proof — signed Ed25519 artifact with payload_hash, anchor_status",
    "decision_receipt — structured receipt when receipt DB is configured (may be null)",
  ],
  howTheyVerifyIndependently: [
    "Call GET verify_url (or GET /api/proof/{proof_id}) — no API key required",
    "Check signature_valid === true and proof_reliable === true",
    "Or verify locally: use public_key + payload + signature (Ed25519 over payload hash)",
    "Public issuer key also at GET /api/credentials/public-key",
    "No inbox, no email relay — the proof is the artifact",
  ],
} as const;

/** Three supported verify modes — pick one per integration. */
export const VERIFY_MODE_GUIDE = [
  {
    mode: "registry",
    when: "You gate on an Abraxas asset or registry record (e.g. ABX-RE-HOSP-001)",
    auth: "Authorization: Bearer abx_live_… recommended; optional for public registry lookup",
    body: { record_id: "ABX-RE-HOSP-001", policy_id: DEFAULT_POLICY_ID },
  },
  {
    mode: "credential_jwt",
    when: "User presents a W3C Verifiable Credential JWT from Abraxas Passport",
    auth: "None — public endpoint when credential_jwt is provided",
    body: { credential_jwt: "eyJ…", policy_id: DEFAULT_POLICY_ID, verifier_id: "your-company" },
  },
  {
    mode: "policy_check",
    when: "You gate on wallet verification level for a specific action",
    auth: "Authorization: Bearer abx_live_… required",
    body: {
      sui_address: "0x…",
      requested_action: "invest_rwa",
      policy_id: DEFAULT_POLICY_ID,
    },
  },
] as const;

export const VALID_REQUESTED_ACTIONS = [
  "browse",
  "book_asset",
  "high_value_transaction",
  "invest_rwa",
  "submit_asset",
  "verified_participant",
] as const;

export const VERIFY_HTTP_STATUS = {
  200: "Decision approved (registry or credential verified)",
  202: "Manual review required (policy check)",
  403: "Denied by policy check",
  404: "Record not found (registry mode)",
  422: "Credential JWT invalid or revoked",
  400: "Missing or invalid request body",
  401: "Missing or invalid partner API key (when required)",
} as const;

/** Example response — registry verify for Cielo Sunrise (approved). */
export const EXAMPLE_VERIFY_RESPONSE_APPROVED = {
  decision: "approved",
  status: "active",
  assurance_level: 3,
  policy_id: DEFAULT_POLICY_ID,
  policy_version: "2026-07-08",
  decision_reference: "abx-dec-yourco-a1b2c3d4",
  valid_until: null,
  record_id: "ABX-RE-HOSP-001",
  record_type: "asset",
  verified: true,
  proof_id: "aprx_cielo_sunrise_7f3a9c2e",
  verify_url: `${EXTERNAL_RP_BASE_URL}/api/proof/aprx_cielo_sunrise_7f3a9c2e`,
  authentication_proof: {
    proof_id: "aprx_cielo_sunrise_7f3a9c2e",
    payload_hash: "a3f2…64 hex chars",
    signature: "base64url Ed25519 signature",
    signing_key_id: "abraxas-primary",
    anchor_status: "signed",
    sui_tx_digest: null,
    explorer_url: null,
    verify_url: `${EXTERNAL_RP_BASE_URL}/api/proof/aprx_cielo_sunrise_7f3a9c2e`,
    issued_at: "2026-07-20T14:00:00.000Z",
    event_type: "credential_verify",
    record_id: "abx-dec-yourco-a1b2c3d4",
    network: "devnet",
    status: "active",
  },
  decision_receipt: null,
} as const;

/** Example response — GET /api/proof/[id] (self-verifying). */
export const EXAMPLE_PROOF_LOOKUP_RESPONSE = {
  artifact_type: "authentication_proof",
  proof_id: "aprx_cielo_sunrise_7f3a9c2e",
  payload: {
    proof_id: "aprx_cielo_sunrise_7f3a9c2e",
    schema_version: "1.0.0",
    event_type: "credential_verify",
    record_id: "abx-dec-yourco-a1b2c3d4",
    payload_hash: "a3f2…",
    issued_at: "2026-07-20T14:00:00.000Z",
    network: "devnet",
  },
  signature: "base64url…",
  signing_key_id: "abraxas-primary",
  public_key: { kty: "OKP", crv: "Ed25519", x: "…" },
  signature_valid: true,
  payload_hash: "a3f2…",
  anchor_status: "signed",
  sui_network: "devnet",
  sui_tx_digest: null,
  explorer_url: null,
  issued_at: "2026-07-20T14:00:00.000Z",
  event_type: "credential_verify",
  record_id: "abx-dec-yourco-a1b2c3d4",
  independently_verifiable: true,
  anchor_note: "Cryptographically signed off-chain. Sui anchor pending package deploy.",
  proof_status: "active",
  proof_reliable: true,
  superseded_by: null,
  asset_abx_id: "ABX-RE-HOSP-001",
} as const;

/** Minimal happy-path integration — copy-paste for external developers. */
export const MINIMAL_RP_INTEGRATION_EXAMPLE = `// Step 1 — Verify (server-side only)
const verifyRes = await fetch("${EXTERNAL_RP_BASE_URL}/api/credentials/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abx_live_YOUR_KEY",
  },
  body: JSON.stringify({
    record_id: "ABX-RE-HOSP-001",
    policy_id: "${DEFAULT_POLICY_ID}",
  }),
});

if (!verifyRes.ok) {
  throw new Error(\`Verify failed: \${verifyRes.status}\`);
}

const result = await verifyRes.json();
// result.decision, result.proof_id, result.verify_url, result.authentication_proof

if (result.decision !== "approved") {
  // Fail closed — do not clear the gated action
  return;
}

// Step 2 — Optional: independently confirm the proof (no API key needed)
const proofRes = await fetch(result.verify_url);
const proof = await proofRes.json();

if (!proof.signature_valid || !proof.proof_reliable) {
  throw new Error("Proof signature invalid or proof no longer reliable");
}

// Clear your gated action — user/asset verified with cryptographic proof on record`;

export const PROOF_LOOKUP_EXAMPLE = `// Independent proof check — anyone can call this
const proofRes = await fetch(
  "${EXTERNAL_RP_BASE_URL}/api/proof/aprx_YOUR_PROOF_ID"
);
const proof = await proofRes.json();

if (proof.signature_valid && proof.proof_reliable) {
  // Cryptographically verified — no need to trust Abraxas UI or email relay
  console.log(proof.payload.event_type, proof.anchor_status);
}`;

export const CURL_VERIFY_EXAMPLE = `curl -s -X POST ${EXTERNAL_RP_BASE_URL}/api/credentials/verify \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer abx_live_YOUR_KEY" \\
  -d '{"record_id":"ABX-RE-HOSP-001","policy_id":"${DEFAULT_POLICY_ID}"}'`;

export const CURL_PROOF_EXAMPLE = `curl -s ${EXTERNAL_RP_BASE_URL}/api/proof/aprx_YOUR_PROOF_ID`;

/** Four-step flow for onboarding conversations. */
export const EXTERNAL_RP_ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Apply for manual review",
    body: `Submit a design partner application at ${PARTNER_APPLICATION_PATH}. Abraxas operators review applications manually and may provision sandbox or production credentials — there is no automatic API-key issuance.`,
  },
  {
    step: 2,
    title: "One verify call",
    body: "POST /api/credentials/verify with record_id, credential_jwt, or sui_address + requested_action. Every decision returns proof_id + verify_url when signing is configured.",
  },
  {
    step: 3,
    title: "Gate on decision",
    body: "Clear your action only when decision === \"approved\". Treat denied and manual_review as fail-closed unless your policy says otherwise.",
  },
  {
    step: 4,
    title: "Confirm the proof",
    body: "GET verify_url from the response. Check signature_valid === true. Store proof_id for audit — anyone can re-verify later.",
  },
] as const;

export const EXTERNAL_RP_ERRORS = [
  {
    case: "Response has decision but no proof_id",
    cause: "ABRAXAS_SIGNING_KEY not configured on Abraxas production, or proof issuance threw",
    action: "Contact Abraxas — proofs should always attach when signing is live",
  },
  {
    case: "GET /api/proof/[id] returns 404",
    cause: "Proof not persisted (Supabase authentication_proofs) or wrong proof_id",
    action: "Use proof_id from the verify response immediately; confirm persistence with Abraxas ops",
  },
  {
    case: "signature_valid === false",
    cause: "Tampered proof, wrong public key, or unsigned legacy proof",
    action: "Fail closed — do not clear the transaction",
  },
  {
    case: "proof_status === refresh_required or superseded",
    cause: "Asset monitoring detected material state change",
    action: "Re-run verify or request fresh credential from holder",
  },
] as const;

/** Machine-readable integration guide for GET /api/docs/relying-party */
export function getExternalRelyingPartyIntegrationGuide() {
  return {
    version: "2026-07-20",
    base_url: EXTERNAL_RP_BASE_URL,
    headline: EXTERNAL_RP_HEADLINE,
    summary: EXTERNAL_RP_SUMMARY,
    onboarding_steps: EXTERNAL_RP_ONBOARDING_STEPS,
    endpoints: {
      verify: {
        method: "POST",
        path: "/api/credentials/verify",
        auth: "Bearer abx_live_… when not using credential_jwt",
        modes: VERIFY_MODE_GUIDE,
        valid_requested_actions: VALID_REQUESTED_ACTIONS,
        http_status: VERIFY_HTTP_STATUS,
        example_response: EXAMPLE_VERIFY_RESPONSE_APPROVED,
        agent_field: "agent",
        agent_proceed_when: "agent.proceed === true (then confirm via GET verify_url)",
      },
      proof_lookup: {
        method: "GET",
        path: "/api/proof/{proof_id}",
        auth: "None — public, self-verifying",
        example_response: EXAMPLE_PROOF_LOOKUP_RESPONSE,
        key_fields: ["signature_valid", "proof_reliable", "public_key", "payload", "agent"],
        agent_field: "agent",
        agent_proceed_when: "agent.valid === true",
      },
      public_key: {
        method: "GET",
        path: "/api/credentials/public-key",
        auth: "None",
        note: "Ed25519 issuer public key for local signature verification",
      },
      production_reference: {
        method: "GET",
        path: "/api/proof/reference/ABX-RE-HOSP-001",
        auth: "None",
        note: "Live demo bundle for Cielo Sunrise — includes verify_response + self_verified_proof",
      },
      loop_status: {
        method: "GET",
        path: "/api/proof/loop",
        auth: "None",
        note: "What is live vs pending Move redeploy",
      },
    },
    examples: {
      minimal_integration: MINIMAL_RP_INTEGRATION_EXAMPLE,
      proof_lookup: PROOF_LOOKUP_EXAMPLE,
      curl_verify: CURL_VERIFY_EXAMPLE,
      curl_proof: CURL_PROOF_EXAMPLE,
    },
    errors: EXTERNAL_RP_ERRORS,
    apply: `${EXTERNAL_RP_BASE_URL}/design-partner`,
    docs_page: `${EXTERNAL_RP_BASE_URL}/docs/relying-party-verify`,
    agent_docs: `${EXTERNAL_RP_BASE_URL}/docs/ai-agents`,
  };
}
