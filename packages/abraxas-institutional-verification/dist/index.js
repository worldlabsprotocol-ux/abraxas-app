import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import 'fs/promises';
import 'fs';
import 'path';
import 'os';

// ../../lib/institutionalVerification/contract.ts
var INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION = "586.v1";
var INSTITUTIONAL_VERIFICATION_CONTRACT_ID = "abraxas_institutional_trust_verification";

// ../../lib/decisionReceipts/types.ts
var DECISION_RECEIPT_SCHEMA_VERSION = "1.0.0";

// ../../lib/decisionReceipts/verificationKeyLifecycle/contract.ts
var RECEIPT_VERIFICATION_KEY_ALGORITHM = "Ed25519";
var RECEIPT_VERIFICATION_KEY_DOCUMENT = "abraxas_receipt_verification_keys";
var RECEIPT_VERIFICATION_REGISTRY_ENV = "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY";
var RECEIPT_KEY_ENVIRONMENTS = ["demo", "production"];
var RECEIPT_KEY_STATUSES = ["active", "retiring", "retired", "revoked"];
var RECEIPT_KEY_REASON_CLASSES = [
  "active",
  "rotation",
  "superseded",
  "expired",
  "compromise",
  "operator",
  "schema_mismatch",
  "unavailable",
  "inconsistent"
];
var RECEIPT_KEY_PUBLIC_FIELDS = [
  "key_id",
  "algorithm",
  "public_jwk",
  "fingerprint",
  "environment",
  "status",
  "issued_at",
  "not_before",
  "expires_at",
  "issuer_label",
  "schema_versions",
  "reason_class",
  "allow_historical_verification",
  "historical_verify_until"
];
var RECEIPT_KEY_DOCUMENT_FIELDS = [
  "document",
  "algorithm",
  "environment",
  "schema_versions",
  "notice",
  "keys"
];
var RECEIPT_KEY_PARTNER_NOTICE = "Partners must re-fetch a current public receipt and honor revocation and currently_valid. Verifying a signature against this document is not a grant.";
var RECEIPT_KEY_ISSUER_LABEL = "Abraxas";
function isPublicDemoRuntime(env = process.env) {
  return env.ABRAXAS_RUNTIME_ENV?.trim() === "demo";
}
function isPublicProductProduction(env = process.env) {
  if (isPublicDemoRuntime(env)) return false;
  return env.VERCEL_ENV === "production" || env.ABRAXAS_RUNTIME_ENV === "production";
}

// ../../lib/decisionReceipts/verificationKeyLifecycle/environment.ts
function resolveReceiptKeyRuntimeEnvironment(env = process.env) {
  if (isPublicProductProduction(env)) return "production";
  if (isPublicDemoRuntime(env)) return "demo";
  return "demo";
}
function normalizeDecisionReceiptTimestamp(value) {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toISOString();
}
function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const obj = value;
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortValue(obj[key]);
  }
  return sorted;
}
function canonicalizeJson(value) {
  return JSON.stringify(sortValue(value));
}
function hashCanonicalPayload(payload) {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
function buildCanonicalPayload(input) {
  return {
    schema_version: input.schema_version ?? "1.0.0",
    receipt_id: input.receipt_id,
    decision_id: input.decision_id,
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    partner_id: input.partner_id,
    subject_pseudonym_id: input.subject_pseudonym_id,
    wallet_binding_ref: input.wallet_binding_ref,
    consent_receipt_id: input.consent_receipt_id,
    decision_result: input.decision_result,
    reason_codes: [...input.reason_codes].sort(),
    evaluated_claim_refs: [...input.evaluated_claim_refs].map((ref) => ({
      claim_id: ref.claim_id,
      claim_type: ref.claim_type,
      issuer_id: ref.issuer_id,
      status: ref.status,
      issued_at: ref.issued_at,
      expires_at: ref.expires_at
    })).sort((a, b) => a.claim_id.localeCompare(b.claim_id)),
    issuer_refs: [...input.issuer_refs].sort(),
    decision_context: input.decision_context,
    evaluated_at: normalizeDecisionReceiptTimestamp(input.evaluated_at),
    expires_at: input.expires_at ? normalizeDecisionReceiptTimestamp(input.expires_at) : null
  };
}

// ../../lib/decisionReceipts/signing.ts
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - padded.length % 4);
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}
function base64UrlEncode(bytes) {
  return Buffer.from(bytes).toString("base64url");
}
function getReceiptSigningKeyId() {
  return process.env.ABRAXAS_SIGNING_KEY_ID ?? "abraxas-primary";
}
function loadReceiptSigningKey() {
  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) return null;
  try {
    const privateKeyJwk = JSON.parse(signingKeyJson);
    const publicKeyJson = process.env.ABRAXAS_PUBLIC_KEY;
    const publicKeyJwk = publicKeyJson ? JSON.parse(publicKeyJson) : { kty: privateKeyJwk.kty, crv: privateKeyJwk.crv, x: privateKeyJwk.x };
    return {
      signingKeyId: getReceiptSigningKeyId(),
      privateKeyJwk,
      publicKeyJwk
    };
  } catch {
    return null;
  }
}
function loadReceiptVerificationKey() {
  const publicKeyJson = process.env.ABRAXAS_PUBLIC_KEY;
  if (!publicKeyJson) {
    const signing = loadReceiptSigningKey();
    return signing?.publicKeyJwk ?? null;
  }
  try {
    return JSON.parse(publicKeyJson);
  } catch {
    return null;
  }
}
function verifyReceiptSignature(payload, signature, publicKeyJwk) {
  if (!publicKeyJwk.x) return false;
  const payloadHash = hashCanonicalPayload(payload);
  const message = Buffer.from(payloadHash, "hex");
  const pubKey = base64UrlDecode(publicKeyJwk.x);
  let sig;
  try {
    sig = base64UrlDecode(signature);
  } catch {
    return false;
  }
  if (sig.length !== nacl.sign.signatureLength) return false;
  return nacl.sign.detached.verify(message, sig, pubKey);
}
function generateTestSigningKeyPair(signingKeyId = getReceiptSigningKeyId()) {
  const keyPair = nacl.sign.keyPair();
  const privateKeyJwk = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64UrlEncode(keyPair.publicKey),
    d: base64UrlEncode(keyPair.secretKey.slice(0, 32))
  };
  const publicKeyJwk = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64UrlEncode(keyPair.publicKey)
  };
  return {
    signingKeyId,
    privateKeyJwk,
    publicKeyJwk
  };
}
function publicReceiptJwkFingerprint(jwk) {
  return createHash("sha256").update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x })).digest("hex");
}
function toPublicReceiptJwk(jwk) {
  if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || !jwk.x) {
    return null;
  }
  if (typeof jwk.d === "string") {
    return { kty: "OKP", crv: "Ed25519", x: jwk.x };
  }
  return { kty: "OKP", crv: "Ed25519", x: jwk.x };
}

// ../../lib/decisionReceipts/verificationKeyLifecycle/registry.ts
var IMPLICIT_NOT_BEFORE = "2020-01-01T00:00:00.000Z";
var IMPLICIT_EXPIRES = "2099-01-01T00:00:00.000Z";
function isStatus(value) {
  return typeof value === "string" && RECEIPT_KEY_STATUSES.includes(value);
}
function isEnvironment(value) {
  return typeof value === "string" && RECEIPT_KEY_ENVIRONMENTS.includes(value);
}
function isReason(value) {
  return typeof value === "string" && RECEIPT_KEY_REASON_CLASSES.includes(value);
}
function parsePublicJwk(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value;
  if (typeof record.d === "string") return null;
  return toPublicReceiptJwk({
    kty: typeof record.kty === "string" ? record.kty : void 0,
    crv: typeof record.crv === "string" ? record.crv : void 0,
    x: typeof record.x === "string" ? record.x : void 0
  });
}
function parseEntry(raw, fallbackEnvironment) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "inconsistent";
  const row = raw;
  if ("d" in row || "private_key" in row || "seed" in row) return "inconsistent";
  const keyId = typeof row.key_id === "string" ? row.key_id.trim() : "";
  if (!keyId) return "inconsistent";
  const publicJwk = parsePublicJwk(row.public_jwk);
  if (!publicJwk) return "inconsistent";
  const environment = isEnvironment(row.environment) ? row.environment : fallbackEnvironment;
  const status = isStatus(row.status) ? row.status : "active";
  const schemaVersions = Array.isArray(row.schema_versions) ? row.schema_versions.filter((item) => typeof item === "string" && item.trim().length > 0) : [DECISION_RECEIPT_SCHEMA_VERSION];
  if (schemaVersions.length === 0) return "inconsistent";
  const issuedAt = typeof row.issued_at === "string" ? row.issued_at : IMPLICIT_NOT_BEFORE;
  const notBefore = typeof row.not_before === "string" ? row.not_before : issuedAt;
  const expiresAt = row.expires_at === null || row.expires_at === void 0 ? null : typeof row.expires_at === "string" ? row.expires_at : "inconsistent";
  if (expiresAt === "inconsistent") return "inconsistent";
  const historicalUntil = row.historical_verify_until === null || row.historical_verify_until === void 0 ? null : typeof row.historical_verify_until === "string" ? row.historical_verify_until : "inconsistent";
  if (historicalUntil === "inconsistent") return "inconsistent";
  const allowHistorical = typeof row.allow_historical_verification === "boolean" ? row.allow_historical_verification : status === "retiring" || status === "retired";
  const reason = isReason(row.reason_class) ? row.reason_class : status === "active" ? "active" : status === "revoked" ? "compromise" : "rotation";
  return {
    key_id: keyId,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    status,
    public_jwk: publicJwk,
    fingerprint: publicReceiptJwkFingerprint(publicJwk),
    issuer_label: typeof row.issuer_label === "string" && row.issuer_label.trim() ? row.issuer_label.trim() : RECEIPT_KEY_ISSUER_LABEL,
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    schema_versions: schemaVersions,
    reason_class: reason,
    allow_historical_verification: allowHistorical,
    historical_verify_until: historicalUntil
  };
}
function implicitActiveKey(env, environment) {
  const publicJwk = toPublicReceiptJwk(loadReceiptVerificationKey() ?? void 0);
  if (!publicJwk) return null;
  const keyId = (env.ABRAXAS_SIGNING_KEY_ID ?? getReceiptSigningKeyId()).trim() || "abraxas-primary";
  return {
    key_id: keyId,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    status: "active",
    public_jwk: publicJwk,
    fingerprint: publicReceiptJwkFingerprint(publicJwk),
    issuer_label: RECEIPT_KEY_ISSUER_LABEL,
    issued_at: IMPLICIT_NOT_BEFORE,
    not_before: IMPLICIT_NOT_BEFORE,
    expires_at: IMPLICIT_EXPIRES,
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    reason_class: "active",
    allow_historical_verification: false,
    historical_verify_until: null
  };
}
function loadReceiptVerificationRegistry(env = process.env) {
  const environment = resolveReceiptKeyRuntimeEnvironment(env);
  const implicit = implicitActiveKey(env, environment);
  const raw = env[RECEIPT_VERIFICATION_REGISTRY_ENV]?.trim();
  if (!raw) {
    if (!implicit) return { ok: false, reason: "unavailable" };
    return { ok: true, keys: [implicit], environment };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "inconsistent" };
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const keys = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const entry = parseEntry(row, environment);
    if (entry === "inconsistent") return { ok: false, reason: "inconsistent" };
    if (!entry) continue;
    if (seen.has(entry.key_id)) return { ok: false, reason: "inconsistent" };
    seen.add(entry.key_id);
    keys.push(entry);
  }
  if (implicit && !seen.has(implicit.key_id)) {
    keys.push(implicit);
  } else if (implicit) {
    const listed = keys.find((key) => key.key_id === implicit.key_id);
    if (listed && listed.fingerprint !== implicit.fingerprint && listed.status === "active") {
      return { ok: false, reason: "inconsistent" };
    }
  }
  if (keys.length === 0) return { ok: false, reason: "unavailable" };
  const active = keys.filter((key) => key.status === "active" && key.environment === environment);
  if (active.length > 1) return { ok: false, reason: "inconsistent" };
  return { ok: true, keys, environment };
}

// ../../lib/decisionReceipts/verificationKeyLifecycle/resolve.ts
function inWindow(key, now, mode) {
  const nowMs = now.getTime();
  const notBefore = Date.parse(key.not_before);
  if (Number.isNaN(notBefore) || nowMs < notBefore) return "not_yet_valid";
  if (key.status === "revoked") return "revoked";
  if (key.status === "active") {
    if (key.expires_at) {
      const expires = Date.parse(key.expires_at);
      if (Number.isNaN(expires) || nowMs >= expires) return "expired";
    }
    return "ok";
  }
  if (key.status === "retiring" || key.status === "retired") {
    if (!key.allow_historical_verification) return "historical_not_allowed";
    if (key.historical_verify_until) {
      const until = Date.parse(key.historical_verify_until);
      if (Number.isNaN(until) || nowMs >= until) return "expired";
    }
    return "ok";
  }
  return "revoked";
}
function resolveVerificationKey(input) {
  const env = input.env ?? process.env;
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const runtime = input.runtimeEnvironment ?? loaded.environment;
  const key = loaded.keys.find((item) => item.key_id === input.keyId);
  if (!key) return { ok: false, reason: "unknown_key" };
  if (key.environment !== runtime) return { ok: false, reason: "wrong_environment" };
  if (!key.schema_versions.includes(input.schemaVersion)) return { ok: false, reason: "schema_mismatch" };
  const windowReason = inWindow(key, input.now ?? /* @__PURE__ */ new Date());
  if (windowReason !== "ok") return { ok: false, reason: windowReason };
  return { ok: true, key };
}
function verifyRecordSignatureWithRegistry(record, now, env) {
  const resolved = resolveVerificationKey({
    keyId: record.signing_key_id,
    schemaVersion: record.schema_version,
    now,
    env
  });
  if (!resolved.ok) return false;
  const payload = buildCanonicalPayload({
    receipt_id: record.id,
    schema_version: record.schema_version,
    decision_id: record.verification_decision_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    consent_receipt_id: record.consent_receipt_id,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at
  });
  return verifyReceiptSignature(payload, record.signature, resolved.key.public_jwk);
}

// ../../lib/partner/sandboxInstitutionalProtocolAccess/contract.ts
var SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID = "sandbox_institutional_protocol_access";
var SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION = "activate_protocol_access";
var SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE = "sandbox:protocol_access";
var SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER = "abraxas.organization_eligibility";
var SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE = "Technical sandbox policy only. It is not live KYB, KYC, AML/KYT, legal certification, production access, Utila integration, or permission to move funds.";
function isSandboxInstitutionalProtocolAccessPolicyId(policyId) {
  return policyId.trim() === SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
}

// ../../lib/partner/launchpad/policyPacks.ts
var POLICY_PACK_CATALOG_VERSION = 1;
var SANDBOX = {
  sandbox_only: true,
  account_required: true,
  consent_required: true
};
function pack(input) {
  return { ...input, catalog_version: POLICY_PACK_CATALOG_VERSION };
}
var POLICY_PACKS = {
  age_18_retail: pack({
    id: "age_18_retail",
    display_name: "Age 18 eligibility",
    holder_explanation: "Confirm you meet an 18+ eligibility threshold without sharing your birth date with the partner.",
    required_claims: ["identity_verified"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Adult only commerce storefront browse or checkout gates",
      "Membership sites that ask only whether the holder is 18+"
    ],
    partner_receives: "Signed result age_eligible_18 (boolean equivalent decision), not a birth date.",
    partner_does_not_receive: ["date of birth", "government ID images", "legal name", "email"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "age_eligible_18",
    receipt_claim: "age_threshold_met",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "source_expiry", max_age_hours: null },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      minimum_age: 18,
      session_receipt_hours: 24,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L1" }]
    }
  }),
  age_21_retail: pack({
    id: "age_21_retail",
    display_name: "Age 21 eligibility",
    holder_explanation: "Confirm you meet a 21+ eligibility threshold without sharing your birth date with the partner.",
    required_claims: ["identity_verified"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Age gated retail browse or purchase policies",
      "Hospitality check in that only needs a 21+ answer"
    ],
    partner_receives: "Signed result age_eligible_21. This is not a legal finding or license.",
    partner_does_not_receive: ["date of birth", "government ID images", "legal name", "email"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "age_eligible_21",
    receipt_claim: "age_threshold_met",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "source_expiry", max_age_hours: null },
    permitted_methods: ["passport"],
    allowed_activity_categories: ["repeat_participant", "holder_loyalty"],
    rules: {
      ...SANDBOX,
      minimum_age: 21,
      session_receipt_hours: 24,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }]
    }
  }),
  residency_us: pack({
    id: "residency_us",
    display_name: "Residency / jurisdiction eligibility",
    holder_explanation: "Confirm a residency_country credential is active. The partner learns whether the jurisdiction check passed, not your full address.",
    required_claims: ["residency_country"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 48,
    intended_use_examples: [
      "Region limited product access",
      "Jurisdictional eligibility before a partner applies its own legal review"
    ],
    partner_receives: "Signed result residency_check_passed. Not a tax, visa, or sanctions determination.",
    partner_does_not_receive: ["street address", "government ID images", "legal name", "email"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "residency_check_passed",
    receipt_claim: "jurisdiction_met",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 48 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 48,
      required_claims: [{ claim_type: "residency_country", min_assurance: "L2" }]
    }
  }),
  wallet_control: pack({
    id: "wallet_control",
    display_name: "Wallet control eligibility",
    holder_explanation: "Prove control of the wallet bound to your Abraxas account. Google sign-in alone is not wallet control.",
    required_claims: ["wallet_binding_confirmed"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 12,
    intended_use_examples: [
      "Protocol actions that require a bound wallet",
      "Collector or trading venues that only need proof of control, not a profile"
    ],
    partner_receives: "Signed result wallet_control_confirmed. Not an onchain balance or trading history.",
    partner_does_not_receive: ["private keys", "seed phrases", "email", "government ID images"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "wallet_control_confirmed",
    receipt_claim: "wallet_binding_confirmed",
    reuse_policy: "session",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 12 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 12,
      required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }]
    }
  }),
  membership_credential: pack({
    id: "membership_credential",
    display_name: "Membership / credential eligibility",
    holder_explanation: "Confirm you hold an active Abraxas issued identity credential accepted by this policy.",
    required_claims: ["identity_verified"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 12,
    intended_use_examples: [
      "Member only surfaces that only need an active credential flag",
      "Clubs or protocols that already issue their own membership off platform"
    ],
    partner_receives: "Signed result credential_active. Not a member directory or profile.",
    partner_does_not_receive: ["email", "legal name", "government ID images", "membership documents"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "credential_active",
    receipt_claim: "identity_verified",
    reuse_policy: "session",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 12 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 12,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }]
    }
  }),
  collector_redemption: pack({
    id: "collector_redemption",
    display_name: "Collector or redemption eligibility",
    holder_explanation: "Confirm an active product_eligibility credential for this partner's configured action. This is not a marketplace, pack opening, or trading product.",
    required_claims: ["product_eligibility"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Redemption windows that only need eligible / not eligible",
      "Allowlists for collectible or tokenized asset access without storing a buyer profile"
    ],
    partner_receives: "Signed result redemption_eligible. Not inventory, offers, or identity documents.",
    partner_does_not_receive: ["date of birth", "government ID images", "wallet seed", "email"],
    production_suitability: "sandbox_only",
    disclosed_result: "redemption_eligible",
    receipt_claim: "product_eligibility",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "source_expiry", max_age_hours: 24 },
    permitted_methods: ["passport"],
    allowed_activity_categories: ["repeat_participant", "holder_loyalty", "high_activity"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      product_eligibility_action: "redemption_or_access",
      required_claims: [{ claim_type: "product_eligibility", min_assurance: "L1" }]
    }
  }),
  identity_liveness: pack({
    id: "identity_liveness",
    display_name: "Identity plus liveness eligibility",
    holder_explanation: "Confirm an identity credential and a liveness check. Google sign-in is not liveness and is not identity evidence.",
    required_claims: ["identity_verified", "liveness_passed"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Higher assurance partner gates that still only need a boolean result",
      "Account recovery or high risk actions defined by the partner"
    ],
    partner_receives: "Signed result identity_and_liveness_met. Not selfies, ID images, or biometric templates.",
    partner_does_not_receive: ["selfie", "government ID images", "biometric templates", "email", "legal name"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "identity_and_liveness_met",
    receipt_claim: "identity_verified",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 24 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      required_claims: [
        { claim_type: "identity_verified", min_assurance: "L2" },
        { claim_type: "liveness_passed", min_assurance: "L2" }
      ]
    }
  }),
  sandbox_economic_demo: pack({
    id: "sandbox_economic_demo",
    display_name: "Sandbox economic demo (not age verification)",
    holder_explanation: "Sandbox / testnet demonstration only. This pack proves a labeled demo eligibility flag so Preview can exercise receipt-gated settlement. It is not age verification, not identity verification, and not usable in Production.",
    required_claims: ["product_eligibility"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 2,
    intended_use_examples: [
      "Preview Circle Arc testnet receipt demonstration",
      "Sandbox harness for settlement without claiming a real age check"
    ],
    partner_receives: "Signed result sandbox_demo_eligible. Not an age finding and not a Production authorization.",
    partner_does_not_receive: ["date of birth", "government ID images", "legal name", "email", "wallet address"],
    production_suitability: "sandbox_only",
    disclosed_result: "sandbox_demo_eligible",
    receipt_claim: "product_eligibility",
    reuse_policy: "session",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 2 },
    permitted_methods: ["reuse_existing_proof", "partner_age_check", "privacy_preserving"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 2,
      product_eligibility_action: "sandbox_economic_demo",
      required_claims: [{ claim_type: "product_eligibility", min_assurance: "L1" }]
    }
  }),
  content_origin_disclosure: pack({
    id: "content_origin_disclosure",
    display_name: "Content origin disclosure",
    holder_explanation: "Confirm you created or submitted this content, disclose how AI was used, and verify this exact file matches its fingerprint. This is your attestation and disclosure \u2014 not AI detection or rights verification.",
    required_claims: [
      "creator_attested",
      "ai_assistance_disclosed",
      "source_integrity_verified"
    ],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Publishing platforms asking about creator attestation and AI disclosure before listing",
      "Marketplaces verifying a submitted file matches an established fingerprint",
      "Creator tools collecting disclosure without receiving the raw artifact"
    ],
    partner_receives: "Signed narrow result: creator_attested, ai_assistance_disclosed category, and source_integrity_verified. Not authorship verification, rights, or AI detection scores.",
    partner_does_not_receive: [
      "raw file bytes",
      "legal name",
      "government ID",
      "email",
      "AI detector scores",
      "human verification claims",
      "unrelated Passport data"
    ],
    production_suitability: "sandbox_only",
    disclosed_result: "content_origin_disclosed",
    receipt_claim: "content_origin_disclosed",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 24 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      product_eligibility_action: "content_origin_disclosure",
      required_claims: [
        { claim_type: "creator_attested", min_assurance: "L0" },
        { claim_type: "ai_assistance_disclosed", min_assurance: "L0" },
        { claim_type: "source_integrity_verified", min_assurance: "L1" }
      ]
    }
  }),
  content_ai_disclosure: pack({
    id: "content_ai_disclosure",
    display_name: "AI assistance disclosure",
    holder_explanation: "Disclose whether generative AI materially contributed to your work. This is your declared disclosure \u2014 not an AI detection result.",
    required_claims: ["ai_assistance_disclosed"],
    minimum_assurance: "L0",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Publishing platforms asking whether AI assistance was disclosed for a submission",
      "Photography marketplaces requiring creator disclosure before listing",
      "Creator platforms collecting disclosure without receiving the raw file"
    ],
    partner_receives: "Signed result ai_assistance_disclosed. Not an AI probability score or detection verdict.",
    partner_does_not_receive: [
      "raw image or manuscript",
      "legal name",
      "government ID",
      "email",
      "AI detector scores",
      "prompt history",
      "unrelated Passport data"
    ],
    production_suitability: "sandbox_only",
    disclosed_result: "ai_assistance_disclosed",
    receipt_claim: "ai_assistance_disclosed",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 24 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      required_claims: [{ claim_type: "ai_assistance_disclosed", min_assurance: "L0" }]
    }
  }),
  content_source_integrity: pack({
    id: "content_source_integrity",
    display_name: "Source integrity check",
    holder_explanation: "Confirm the artifact you submit matches a fingerprint you previously established with Abraxas. This verifies integrity \u2014 not human authorship or rights.",
    required_claims: ["source_integrity_verified"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 12,
    intended_use_examples: [
      "Marketplaces re-checking an uploaded file against an established fingerprint",
      "Licensing workflows confirming the submitted file has not changed since attestation"
    ],
    partner_receives: "Signed result source_integrity_verified. Not originality, authorship, or rights ownership.",
    partner_does_not_receive: [
      "raw source file",
      "legal name",
      "government ID",
      "email",
      "creator history",
      "unrelated Passport data"
    ],
    production_suitability: "sandbox_only",
    disclosed_result: "source_integrity_verified",
    receipt_claim: "source_integrity_verified",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: true, mode: "time_bound", max_age_hours: 12 },
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 12,
      required_claims: [{ claim_type: "source_integrity_verified", min_assurance: "L1" }]
    }
  }),
  sandbox_institutional_protocol_access: pack({
    id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    display_name: "Sandbox institutional protocol access",
    holder_explanation: `${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE} Sandbox test result for technical integration only. It is not a live KYB or Production approval. The holder completes the existing organization or authorized-signer eligibility flow after an operator issues a sandbox test result. The partner receives an opaque institutional result bound to activate_protocol_access, not a company file.`,
    required_claims: [],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Sandbox app pinned to the reviewed institutional protocol-access policy",
      `Later binding of a fresh sandbox result to a V2 Solana devnet gate for ${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE}`
    ],
    partner_receives: "Signed sandbox institutional result plus opaque commitments. Not a legal name, KYB file, or production authorization.",
    partner_does_not_receive: [
      "legal name",
      "company registration number",
      "documents",
      "beneficial owners",
      "address",
      "wallet",
      "provider payload",
      "raw receipt",
      "callback URL",
      "secret"
    ],
    production_suitability: "sandbox_only",
    disclosed_result: "organization_eligible",
    receipt_claim: "organization_eligible",
    reuse_policy: "time_bound",
    reuse_evidence_freshness: { allow_reuse: false, mode: "none", max_age_hours: null },
    permitted_methods: ["privacy_preserving"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      product_eligibility_action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      allowed_purposes: [SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION],
      enforce_issuer_trust: true,
      required_claims: [{
        claim_type: "organization_eligible",
        min_assurance: "L2",
        accepted_issuers: [SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER]
      }]
    }
  })
};
var POLICY_PACK_LIST = Object.values(POLICY_PACKS);
function policyPackIsSandboxOnly(pack2) {
  return pack2.production_suitability === "sandbox_only";
}

// ../../lib/partner/integrationKit/contract.ts
var PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS = [
  "receipt_id",
  "schema_version",
  "policy_id",
  "policy_version",
  "partner_id",
  "decision_result",
  "status",
  "expires_at",
  "signature_valid",
  "currently_valid",
  "production_usable",
  "decision_context",
  "artifact_type",
  "issued_valid",
  "lifecycle_status",
  "partner_safe_reason",
  "validity_checked_at"
];

// ../../lib/partner/webhooks/payloadAllowlist.ts
var WEBHOOK_PAYLOAD_ALLOWED_KEYS = [
  "event_id",
  "schema_version",
  "event_type",
  "timestamp",
  "occurred_at",
  "partner_id",
  "policy_id",
  "policy_version",
  "receipt_id",
  "decision_id",
  "outcome",
  "reason_code",
  "signature",
  "event_ref",
  "validity_class",
  "expires_at",
  "must_reverify",
  "is_grant"
];

// ../../lib/partner/portableActionContract/contract.ts
var PORTABLE_ACTION_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at"
];

// ../../lib/partner/tradingVenue/contract.ts
var TRADING_VENUE_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at"
];

// ../../lib/partner/paymentAuthorization/contract.ts
var PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "payment_action_binding",
  "expires_at"
];

// ../../lib/passport/verificationActivity/contract.ts
var PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS = [
  "activity_ref",
  "partner_label",
  "policy_label",
  "version_summary",
  "state",
  "state_label",
  "decided_at",
  "shared_result_category",
  "purpose",
  "partner_received",
  "withheld",
  "evidence_not_shared",
  "sandbox_only",
  "current",
  "recovery",
  "partner_entry_href",
  "reuse_consent_notice"
];

// ../../lib/privacy/selectiveDisclosure/contract.ts
var SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES = [
  "raw_evidence",
  "biometric",
  "identity_profile",
  "wallet_material",
  "receipt_crypto",
  "oauth_session",
  "provider_payload",
  "raw_errors",
  "policy_internals"
];
var HOLDER_BRIEF_ALLOWED_FIELDS = [
  "requestor",
  "purpose",
  "result",
  "shared_result_category",
  "withheld",
  "environment_label",
  "environment_detail",
  "method_explanation",
  "google_account_only",
  "identity_not_default"
];
var CONSENT_PREVIEW_ALLOWED_FIELDS = [
  "request_id",
  "partner_id",
  "policy_id",
  "purpose",
  "policy_name",
  "requested_action",
  "requested_claims",
  "claim_labels",
  "never_shared",
  "expires_at",
  "status",
  "shared_result_category",
  "sandbox_only"
];
var PUBLIC_RECEIPT_ALLOWED_FIELDS = [
  ...PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS,
  "evaluated_claim_refs",
  "issuer_refs",
  "reason_codes",
  "evaluated_at",
  "payload_hash",
  "signature",
  "signing_key_id",
  "anchor_reference",
  "subject_pseudonym_id",
  "validity",
  "invalidation_reasons",
  "issued_valid",
  "lifecycle_status",
  "partner_safe_reason",
  "validity_checked_at"
];
var PARTNER_KIT_ALLOWED_FIELDS = [
  "kit_version",
  "outcome",
  "action",
  "errors",
  "receipt_id",
  "decision_result",
  "status",
  "policy_id",
  "partner_id",
  "production_usable",
  "callback_trusted",
  "google_sign_in_is_not_eligibility",
  "replay_behavior"
];
var LAUNCHPAD_SUMMARY_ALLOWED_FIELDS = [
  "status",
  "outcome",
  "reason_code",
  "sandbox_only",
  "production_usable",
  "result_category"
];
var SHARED_SURFACE_FIELDS = {
  public_receipt: PUBLIC_RECEIPT_ALLOWED_FIELDS,
  partner_kit: PARTNER_KIT_ALLOWED_FIELDS,
  webhook_event: WEBHOOK_PAYLOAD_ALLOWED_KEYS,
  holder_brief: HOLDER_BRIEF_ALLOWED_FIELDS,
  consent_preview: CONSENT_PREVIEW_ALLOWED_FIELDS,
  passport_activity: PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS,
  action_contract: PORTABLE_ACTION_CLIENT_VISIBLE_KEYS,
  trading_action: TRADING_VENUE_CLIENT_VISIBLE_KEYS,
  payment_action: PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS,
  launchpad_summary: LAUNCHPAD_SUMMARY_ALLOWED_FIELDS};
var DISCLOSURE_CATALOG_VERSION = POLICY_PACK_CATALOG_VERSION;

// ../../lib/privacy/selectiveDisclosure/profiles.ts
function profileFromPack(pack2) {
  const sandboxOnly = policyPackIsSandboxOnly(pack2);
  return {
    pack_id: pack2.id,
    catalog_version: DISCLOSURE_CATALOG_VERSION,
    result_category: pack2.disclosed_result,
    partner_visible_result: pack2.partner_receives,
    withheld: pack2.partner_does_not_receive,
    sandbox_only: sandboxOnly,
    production_use: sandboxOnly ? "sandbox_only" : "reviewed_production",
    public_receipt_fields: SHARED_SURFACE_FIELDS.public_receipt,
    partner_kit_fields: SHARED_SURFACE_FIELDS.partner_kit,
    webhook_fields: SHARED_SURFACE_FIELDS.webhook_event,
    holder_brief_fields: SHARED_SURFACE_FIELDS.holder_brief,
    consent_fields: SHARED_SURFACE_FIELDS.consent_preview,
    passport_activity_fields: SHARED_SURFACE_FIELDS.passport_activity,
    action_contract_fields: SHARED_SURFACE_FIELDS.action_contract,
    trading_action_fields: SHARED_SURFACE_FIELDS.trading_action,
    payment_action_fields: SHARED_SURFACE_FIELDS.payment_action,
    launchpad_summary_fields: SHARED_SURFACE_FIELDS.launchpad_summary,
    forbidden_classes: SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES
  };
}
POLICY_PACK_LIST.reduce(
  (acc, pack2) => {
    acc[pack2.id] = profileFromPack(pack2);
    return acc;
  },
  {}
);

// ../../lib/privacy/selectiveDisclosure/enforce.ts
var CLAIM_REF_KEYS = [
  "claim_id",
  "claim_type",
  "issuer_id",
  "status",
  "issued_at",
  "expires_at"
];
function pickAllowedKeys(payload, allowed) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const source = payload;
  const out = {};
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = redactNested(key, source[key]);
    }
  });
  return out;
}
function redactNested(key, value) {
  if (key === "evaluated_claim_refs" && Array.isArray(value)) {
    return value.map((item) => pickAllowedKeys(item, CLAIM_REF_KEYS) ?? {});
  }
  if (key === "claim_labels" && Array.isArray(value)) {
    return value.map((item) => pickAllowedKeys(item, ["claim_type", "label", "will_share"]) ?? {});
  }
  if (key === "action_binding" && value && typeof value === "object" && !Array.isArray(value)) {
    return pickAllowedKeys(value, ["action_type", "action_scope", "nonce_state", "wallet_binding"]);
  }
  if (key === "payment_action_binding" && value && typeof value === "object" && !Array.isArray(value)) {
    return pickAllowedKeys(value, ["action_type", "action_scope", "nonce_state", "authorization_kind"]);
  }
  if (key === "signature" && value && typeof value === "object" && !Array.isArray(value)) {
    return pickAllowedKeys(value, ["alg", "version", "header", "timestamp_header", "id_header"]);
  }
  return value;
}

// ../../lib/decisionReceipts/verificationKeyLifecycle/safety.ts
function assertNoPrivateReceiptKeyMaterial(payload) {
  const leaks = [];
  const blob = JSON.stringify(payload ?? null);
  const lower = blob.toLowerCase();
  const needles = [
    '"d"',
    "private_key",
    "abraxas_signing_key",
    "seed phrase",
    "secretkey"
  ];
  for (const needle of needles) {
    if (lower.includes(needle)) leaks.push(needle);
  }
  return leaks;
}

// ../../lib/decisionReceipts/verificationKeyLifecycle/publicDocument.ts
function toPublicView(key) {
  const view = {
    key_id: key.key_id,
    algorithm: key.algorithm,
    public_jwk: key.public_jwk,
    fingerprint: key.fingerprint,
    environment: key.environment,
    status: key.status,
    issued_at: key.issued_at,
    not_before: key.not_before,
    expires_at: key.expires_at,
    issuer_label: key.issuer_label,
    schema_versions: key.schema_versions,
    reason_class: key.reason_class,
    allow_historical_verification: key.allow_historical_verification,
    historical_verify_until: key.historical_verify_until
  };
  return pickAllowedKeys(view, RECEIPT_KEY_PUBLIC_FIELDS) ?? view;
}
function buildReceiptVerificationKeyDocument(env = process.env) {
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return { ok: false, status: loaded.reason };
  const keys = loaded.keys.filter((key) => key.environment === loaded.environment).map((key) => toPublicView(key));
  const document = {
    document: RECEIPT_VERIFICATION_KEY_DOCUMENT,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment: loaded.environment,
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    notice: RECEIPT_KEY_PARTNER_NOTICE,
    keys
  };
  const visible = pickAllowedKeys(document, RECEIPT_KEY_DOCUMENT_FIELDS) ?? document;
  if (assertNoPrivateReceiptKeyMaterial(visible).length > 0) {
    return { ok: false, status: "inconsistent" };
  }
  return visible;
}

// ../../lib/passport/reusableCredential/independentInstitutionConfig.ts
var PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV = "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS";
var PORTABLE_REVOCATION_ISSUER_TRUST_ENV = "ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST";

// ../../lib/institutionalVerification/trustMaterial.ts
var RECEIPT_TRUST_DIGEST_VERSION = 2;
function isStatus2(value) {
  return typeof value === "string" && RECEIPT_KEY_STATUSES.includes(value);
}
function isEnvironment2(value) {
  return typeof value === "string" && RECEIPT_KEY_ENVIRONMENTS.includes(value);
}
function isReason2(value) {
  return typeof value === "string" && RECEIPT_KEY_REASON_CLASSES.includes(value);
}
function parseRegistryEntry(raw, fallbackEnvironment) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "inconsistent";
  const row = raw;
  if ("d" in row || "private_key" in row || "seed" in row) return "inconsistent";
  const keyId = typeof row.key_id === "string" ? row.key_id.trim() : "";
  if (!keyId) return "inconsistent";
  const jwkRaw = row.public_jwk;
  if (!jwkRaw || typeof jwkRaw !== "object" || Array.isArray(jwkRaw)) return "inconsistent";
  const jwkRecord = jwkRaw;
  if (typeof jwkRecord.d === "string") return "inconsistent";
  const publicJwk = toPublicReceiptJwk(jwkRecord);
  if (!publicJwk) return "inconsistent";
  const fingerprint = publicReceiptJwkFingerprint(publicJwk);
  if (typeof row.fingerprint === "string" && row.fingerprint !== fingerprint) {
    return "inconsistent";
  }
  const environment = isEnvironment2(row.environment) ? row.environment : fallbackEnvironment;
  const status = isStatus2(row.status) ? row.status : "active";
  const schemaVersions = Array.isArray(row.schema_versions) ? row.schema_versions.filter((item) => typeof item === "string" && item.trim().length > 0) : [DECISION_RECEIPT_SCHEMA_VERSION];
  if (schemaVersions.length === 0) return "inconsistent";
  const issuedAt = typeof row.issued_at === "string" ? row.issued_at : "2020-01-01T00:00:00.000Z";
  const notBefore = typeof row.not_before === "string" ? row.not_before : issuedAt;
  const expiresAt = row.expires_at === null || row.expires_at === void 0 ? null : typeof row.expires_at === "string" ? row.expires_at : "inconsistent";
  if (expiresAt === "inconsistent") return "inconsistent";
  const reason = isReason2(row.reason_class) ? row.reason_class : status === "active" ? "active" : status === "revoked" ? "compromise" : "rotation";
  return {
    key_id: keyId,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    status,
    public_jwk: publicJwk,
    fingerprint,
    issuer_label: typeof row.issuer_label === "string" && row.issuer_label.trim() ? row.issuer_label.trim() : "Abraxas",
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    schema_versions: schemaVersions,
    reason_class: reason,
    allow_historical_verification: typeof row.allow_historical_verification === "boolean" ? row.allow_historical_verification : status === "retiring" || status === "retired",
    historical_verify_until: (() => {
      if (row.historical_verify_until === null || row.historical_verify_until === void 0) return null;
      if (typeof row.historical_verify_until === "string") return row.historical_verify_until;
      return null;
    })()
  };
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(",")}}`;
}
function canonicalDigestKey(key) {
  return {
    allow_historical_verification: key.allow_historical_verification,
    algorithm: key.algorithm,
    environment: key.environment,
    expires_at: key.expires_at,
    fingerprint: key.fingerprint,
    historical_verify_until: key.historical_verify_until,
    issued_at: key.issued_at,
    issuer_label: key.issuer_label,
    key_id: key.key_id,
    not_before: key.not_before,
    reason_class: key.reason_class,
    schema_versions: [...key.schema_versions].sort(),
    status: key.status
  };
}
function digestReceiptVerificationTrustKeys(document, keys) {
  const sortedKeys = keys.map(canonicalDigestKey).sort((a, b) => String(a.key_id).localeCompare(String(b.key_id)));
  const payload = {
    digest_version: RECEIPT_TRUST_DIGEST_VERSION,
    document: document.document,
    algorithm: document.algorithm,
    environment: document.environment,
    schema_versions: [...document.schema_versions].sort(),
    keys: sortedKeys
  };
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}
function parseInstitutionReceiptVerificationRegistryRows(rawJson, environment) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, code: "invalid_document" };
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const keys = [];
  const seenKeyIds = /* @__PURE__ */ new Set();
  const seenFingerprints = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const entry = parseRegistryEntry(row, environment);
    if (entry === "inconsistent") return { ok: false, code: "registry_inconsistent" };
    if (!entry) continue;
    if (seenKeyIds.has(entry.key_id)) return { ok: false, code: "registry_inconsistent" };
    if (seenFingerprints.has(entry.fingerprint)) return { ok: false, code: "registry_inconsistent" };
    seenKeyIds.add(entry.key_id);
    seenFingerprints.add(entry.fingerprint);
    keys.push(entry);
  }
  if (keys.length === 0) return { ok: false, code: "registry_unavailable" };
  const active = keys.filter((key) => key.status === "active" && key.environment === environment);
  if (active.length > 1) return { ok: false, code: "registry_inconsistent" };
  return { ok: true, keys };
}
function registryEnvValueFromKeys(keys) {
  return JSON.stringify(
    keys.map(
      ({
        key_id,
        algorithm,
        environment: env,
        status,
        public_jwk,
        fingerprint,
        issued_at,
        not_before,
        expires_at,
        schema_versions,
        issuer_label,
        reason_class,
        allow_historical_verification,
        historical_verify_until
      }) => ({
        key_id,
        algorithm,
        environment: env,
        status,
        public_jwk,
        fingerprint,
        issued_at,
        not_before,
        expires_at,
        schema_versions,
        issuer_label,
        reason_class,
        allow_historical_verification,
        historical_verify_until
      })
    )
  );
}
function validateInstitutionReceiptVerificationRegistryJson(rawJson, environment = "demo") {
  const parsed = parseInstitutionReceiptVerificationRegistryRows(rawJson, environment);
  if (!parsed.ok) {
    return {
      ok: false,
      code: parsed.code === "registry_unavailable" ? "registry_unavailable" : parsed.code === "registry_inconsistent" ? "registry_inconsistent" : "invalid_document"
    };
  }
  const { keys } = parsed;
  const document = {
    document: RECEIPT_VERIFICATION_KEY_DOCUMENT,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    notice: RECEIPT_KEY_PARTNER_NOTICE,
    keys: keys.map((key) => ({
      key_id: key.key_id,
      algorithm: key.algorithm,
      public_jwk: key.public_jwk,
      fingerprint: key.fingerprint,
      environment: key.environment,
      status: key.status,
      issued_at: key.issued_at,
      not_before: key.not_before,
      expires_at: key.expires_at,
      issuer_label: key.issuer_label,
      schema_versions: key.schema_versions,
      reason_class: key.reason_class,
      allow_historical_verification: key.allow_historical_verification,
      historical_verify_until: key.historical_verify_until
    }))
  };
  if (assertNoPrivateReceiptKeyMaterial(document).length > 0) {
    return { ok: false, code: "private_material_leak" };
  }
  const digest = digestReceiptVerificationTrustKeys(document, keys);
  return {
    ok: true,
    registry_env_value: registryEnvValueFromKeys(keys),
    digest,
    keys
  };
}
function digestReceiptVerificationKeyDocument(document) {
  const parsed = parseInstitutionReceiptVerificationRegistryRows(
    JSON.stringify(document.keys),
    document.environment
  );
  if (!parsed.ok) {
    return createHash("sha256").update(`invalid:${stableStringify(document)}`).digest("hex");
  }
  return digestReceiptVerificationTrustKeys(document, parsed.keys);
}
function validateFetchedReceiptKeyDocument(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const doc = raw;
  if (doc.document !== "abraxas_receipt_verification_keys") return null;
  if (!Array.isArray(doc.keys)) return null;
  if (assertNoPrivateReceiptKeyMaterial(doc).length > 0) return null;
  for (const key of doc.keys) {
    const expected = publicReceiptJwkFingerprint(key.public_jwk);
    if (key.fingerprint !== expected) return null;
  }
  const validated = validateInstitutionReceiptVerificationRegistryJson(JSON.stringify(doc.keys), doc.environment);
  if (!validated.ok) return null;
  return doc;
}
async function fetchVerifiedReceiptKeyDocument(input) {
  const pin = input.pinnedDigest?.trim();
  if (!pin) {
    return { ok: false, code: "pin_required" };
  }
  const base = input.originUrl.replace(/\/$/, "");
  const fetchFn = input.fetchFn ?? fetch;
  let res;
  try {
    res = await fetchFn(`${base}/api/receipts/verification-keys`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
  } catch {
    return { ok: false, code: "fetch_failed" };
  }
  if (!res.ok) return { ok: false, code: "fetch_failed" };
  let json;
  try {
    json = await res.json();
  } catch {
    return { ok: false, code: "fetch_failed" };
  }
  const document = validateFetchedReceiptKeyDocument(json);
  if (!document) return { ok: false, code: "invalid_document" };
  const digest = digestReceiptVerificationKeyDocument(document);
  if (pin !== digest) {
    return { ok: false, code: "pin_mismatch" };
  }
  const validated = validateInstitutionReceiptVerificationRegistryJson(JSON.stringify(document.keys), document.environment);
  if (!validated.ok) {
    return {
      ok: false,
      code: validated.code === "private_material_leak" ? "private_material_leak" : "invalid_document"
    };
  }
  return {
    ok: true,
    document,
    digest,
    registry_env_value: validated.registry_env_value
  };
}
async function resolveInstitutionalTrustEnv(input) {
  const env = {};
  if (input.extra_env) {
    for (const [key, value] of Object.entries(input.extra_env)) {
      if (typeof value === "string" && value.trim()) env[key] = value.trim();
    }
  }
  let digest = null;
  const keyEnvironment = input.receipt_key_environment ?? "demo";
  if (input.receipt_verification_registry_json?.trim()) {
    const validated = validateInstitutionReceiptVerificationRegistryJson(
      input.receipt_verification_registry_json.trim(),
      keyEnvironment
    );
    if (!validated.ok) {
      return {
        ok: false,
        code: validated.code === "private_material_leak" ? "private_material_leak" : validated.code === "registry_inconsistent" ? "invalid_document" : validated.code === "fingerprint_mismatch" ? "fingerprint_mismatch" : "invalid_document"
      };
    }
    env[RECEIPT_VERIFICATION_REGISTRY_ENV] = validated.registry_env_value;
    digest = validated.digest;
    if (input.pinned_receipt_key_document_digest?.trim() && input.pinned_receipt_key_document_digest.trim() !== digest) {
      return { ok: false, code: "pin_mismatch" };
    }
  } else if (input.trust_origin_url?.trim()) {
    const pin = input.pinned_receipt_key_document_digest?.trim();
    if (!pin) {
      return { ok: false, code: "pin_required" };
    }
    const fetched = await fetchVerifiedReceiptKeyDocument({
      originUrl: input.trust_origin_url.trim(),
      fetchFn: input.fetchFn,
      pinnedDigest: pin
    });
    if (!fetched.ok) {
      return { ok: false, code: fetched.code };
    }
    env[RECEIPT_VERIFICATION_REGISTRY_ENV] = fetched.registry_env_value;
    digest = fetched.digest;
  }
  if (!env[RECEIPT_VERIFICATION_REGISTRY_ENV]) {
    return { ok: false, code: "trust_configuration_missing" };
  }
  if (input.portable_revocation_issuer_trust_json?.trim()) {
    env[PORTABLE_REVOCATION_ISSUER_TRUST_ENV] = input.portable_revocation_issuer_trust_json.trim();
  }
  if (input.portable_revocation_bootstrap_trusts_json?.trim()) {
    env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = input.portable_revocation_bootstrap_trusts_json.trim();
  }
  return { ok: true, env, receipt_key_document_digest: digest };
}

// ../../lib/institutionalVerification/verificationContractDocument.ts
var CAPABILITIES = [
  "receipt_signature_offline",
  "issuer_key_registry_offline",
  "policy_tenant_binding_offline",
  "presentation_strict_binding_offline",
  "portable_revocation_snapshot_offline",
  "receipt_consumption_replay_guard",
  "revocation_checkpoint_freshness",
  "cross_application_policy_isolation"
];
function buildInstitutionalVerificationContractDocument(env = process.env) {
  const receiptDoc = buildReceiptVerificationKeyDocument(env);
  if ("ok" in receiptDoc && receiptDoc.ok === false) {
    return { ok: false, status: "unavailable" };
  }
  if (!("keys" in receiptDoc)) {
    return { ok: false, status: "unavailable" };
  }
  const digest = digestReceiptVerificationKeyDocument(receiptDoc);
  return {
    contract: INSTITUTIONAL_VERIFICATION_CONTRACT_ID,
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    published_at: (/* @__PURE__ */ new Date()).toISOString(),
    capabilities: CAPABILITIES,
    algorithms: {
      decision_receipt_signature: RECEIPT_VERIFICATION_KEY_ALGORITHM,
      portable_revocation_snapshot: RECEIPT_VERIFICATION_KEY_ALGORITHM
    },
    trust_material: {
      receipt_verification_keys_path: "/api/receipts/verification-keys",
      well_known_path: "/.well-known/abraxas-trust/v1",
      receipt_key_document_digest: digest,
      receipt_key_environment: receiptDoc.environment,
      bootstrap_notice: "Integrators must pin receipt_key_document_digest (digest v2 binds key lifecycle metadata) or ship ABRAXAS_RECEIPT_VERIFICATION_REGISTRY offline. Network fetch is rejected without a mandatory digest pin. An HTTPS response alone is never a new issuer grant.",
      institution_env_keys: {
        receipt_registry: "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY",
        portable_revocation_issuer_trust: PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
        portable_revocation_bootstrap_trusts: PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV
      }
    },
    integration: {
      module: "@/lib/institutionalVerification",
      example: "examples/institutional-verifier-backend/verify.ts",
      developer_ui: "/developers/institutional-verification"
    },
    migration: {
      previous_contract_versions: ["584.v0", "569.v0"],
      breaking_change_policy: "contract_version bump when rejection reason codes or required trust inputs change"
    },
    limitations: [
      "Live claim-dependency refresh may require issuer feeds beyond receipt signature verification.",
      "Portable revocation issuer trust must be configured by the institution \u2014 not inferred from Abraxas UI.",
      "Cryptographic verification does not depend on Abraxas billing or Supabase.",
      "Production signing activation and private key rotation remain operator-controlled."
    ]
  };
}

// ../../lib/partner/sandboxPartner.ts
var SANDBOX_POLICY_ID = "partner-sandbox-gate-v1";
var LEGACY_SANDBOX_POLICY_ID = "meridian-investor-gate-v1";
function isSandboxPolicyId(policyId) {
  return policyId === SANDBOX_POLICY_ID || policyId === LEGACY_SANDBOX_POLICY_ID || isSandboxInstitutionalProtocolAccessPolicyId(policyId);
}

// ../../lib/decisionReceipts/views.ts
function resolveReceiptStatus(record) {
  if (record.status === "revoked" || record.revoked_at) return "revoked";
  if (record.expires_at && new Date(record.expires_at) < /* @__PURE__ */ new Date()) return "expired";
  return record.status === "expired" ? "expired" : "active";
}
function verifyRecordSignature(record) {
  return verifyRecordSignatureWithRegistry(record);
}
function toPublicView2(record) {
  const status = resolveReceiptStatus(record);
  const signatureValid = verifyRecordSignature(record);
  const view = {
    receipt_id: record.id,
    schema_version: record.schema_version,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    production_usable: record.decision_context === "production" && !isSandboxPolicyId(record.policy_id),
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at,
    status,
    payload_hash: record.payload_hash,
    signature: record.signature,
    signing_key_id: record.signing_key_id,
    signature_valid: signatureValid,
    anchor_reference: record.anchor_reference,
    artifact_type: "eligibility_decision_receipt"
  };
  return pickAllowedKeys(view, SHARED_SURFACE_FIELDS.public_receipt) ?? view;
}

// ../../lib/decisionReceipts/receiptIntegrityDiagnostics.ts
function canonicalFromRecord(record) {
  return buildCanonicalPayload({
    receipt_id: record.id,
    schema_version: record.schema_version,
    decision_id: record.verification_decision_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    consent_receipt_id: record.consent_receipt_id,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at
  });
}
function evaluateReceiptIntegrity(record) {
  const canonical = canonicalFromRecord(record);
  const recomputedHash = hashCanonicalPayload(canonical);
  return {
    payload_hash_matches_recomputed: record.payload_hash === recomputedHash,
    signature_valid: verifyRecordSignature(record)
  };
}

// ../../lib/decisionReceipts/trustEvaluation.ts
function productionUsableForRecord(input) {
  return input.decision_context === "production" && !isSandboxPolicyId(input.policy_id);
}
function resolveSyncClaimInvalidation(claimRefs) {
  if (!claimRefs?.length) return null;
  for (const ref of claimRefs) {
    const status = ref.status?.toLowerCase();
    if (status === "revoked") return "claim_revoked";
    if (status === "suspended" || status === "under_review") return "access_revoked";
    if (status === "expired") return "claim_expired";
  }
  return null;
}
function applyTrustGates(base, record, context) {
  const production_usable = productionUsableForRecord({
    decision_context: record.decision_context ?? "production",
    policy_id: record.policy_id
  });
  const allowSandbox = context?.allowSandbox === true;
  if (!base.signature_valid) {
    return {
      currently_valid: false,
      validity: base.validity,
      signature_valid: false,
      production_usable,
      invalidation_reasons: base.invalidation_reasons.length ? base.invalidation_reasons : ["signature_invalid"]
    };
  }
  if (record.decision_result !== "approved") {
    const validity = record.decision_result === "manual_review" ? "decision_manual_review" : "decision_not_approved";
    return {
      currently_valid: false,
      validity,
      signature_valid: true,
      production_usable,
      invalidation_reasons: [`decision_not_approved:${record.decision_result}`]
    };
  }
  if (context?.partnerId && record.partner_id !== context.partnerId) {
    return {
      currently_valid: false,
      validity: "partner_mismatch",
      signature_valid: true,
      production_usable,
      invalidation_reasons: [`partner_mismatch:expected=${context.partnerId},got=${record.partner_id}`]
    };
  }
  if (context?.policyId && record.policy_id !== context.policyId) {
    return {
      currently_valid: false,
      validity: "policy_mismatch",
      signature_valid: true,
      production_usable,
      invalidation_reasons: [`policy_mismatch:expected=${context.policyId},got=${record.policy_id}`]
    };
  }
  if (!base.currently_valid) {
    if (allowSandbox && base.validity === "sandbox_only") {
      return {
        currently_valid: true,
        validity: "sandbox_only",
        signature_valid: true,
        production_usable: false,
        invalidation_reasons: base.invalidation_reasons
      };
    }
    return {
      currently_valid: false,
      validity: base.validity,
      signature_valid: true,
      production_usable,
      invalidation_reasons: base.invalidation_reasons
    };
  }
  if (!allowSandbox && !production_usable) {
    let productionReason = "production_not_usable";
    if (context?.productionUsableRaw === false) {
      productionReason = "production_not_usable:false";
    } else if (context?.productionUsableRaw !== true) {
      productionReason = "production_not_usable:missing";
    }
    return {
      currently_valid: false,
      validity: "sandbox_only",
      signature_valid: true,
      production_usable: false,
      invalidation_reasons: [productionReason]
    };
  }
  return {
    currently_valid: true,
    validity: "active",
    signature_valid: true,
    production_usable,
    invalidation_reasons: []
  };
}
function evaluatePublicReceiptTrust(receipt, context) {
  const now = context.now ?? /* @__PURE__ */ new Date();
  if (!receipt || typeof receipt !== "object") {
    return {
      currently_valid: false,
      validity: "invalidated",
      signature_valid: false,
      production_usable: false,
      invalidation_reasons: ["receipt_missing"]
    };
  }
  const signature_valid = receipt.signature_valid === true;
  const storedStatus = receipt.status;
  const production_usable = receipt.production_usable === true;
  let base;
  if (!signature_valid) {
    base = {
      currently_valid: false,
      validity: "signature_invalid",
      signature_valid: false,
      invalidation_reasons: ["signature_invalid"]
    };
  } else if (storedStatus === "revoked") {
    base = {
      currently_valid: false,
      validity: "access_revoked",
      signature_valid: true,
      invalidation_reasons: ["receipt_revoked"]
    };
  } else if (storedStatus == null || storedStatus === "") {
    base = {
      currently_valid: false,
      validity: "invalidated",
      signature_valid: true,
      invalidation_reasons: ["status_not_active:missing"]
    };
  } else if (storedStatus !== "active") {
    base = {
      currently_valid: false,
      validity: storedStatus === "expired" ? "expired" : "invalidated",
      signature_valid: true,
      invalidation_reasons: [`status_not_active:${storedStatus}`]
    };
  } else if (receipt.expires_at == null || receipt.expires_at === "") {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["expires_at_missing"]
    };
  } else if (Number.isNaN(new Date(receipt.expires_at).getTime())) {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["expires_at_invalid"]
    };
  } else if (new Date(receipt.expires_at).getTime() <= now.getTime()) {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["receipt_expired"]
    };
  } else {
    const claimInvalidation = resolveSyncClaimInvalidation(receipt.evaluated_claim_refs);
    if (claimInvalidation) {
      base = {
        currently_valid: false,
        validity: "access_revoked",
        signature_valid: true,
        invalidation_reasons: [claimInvalidation]
      };
    } else if (receipt.currently_valid === false && Array.isArray(receipt.invalidation_reasons) && receipt.invalidation_reasons.length > 0) {
      base = {
        currently_valid: false,
        validity: receipt.validity ?? "access_revoked",
        signature_valid: true,
        invalidation_reasons: receipt.invalidation_reasons
      };
    } else {
      base = {
        currently_valid: true,
        validity: "active",
        signature_valid: true,
        invalidation_reasons: []
      };
    }
  }
  return applyTrustGates(
    base,
    {
      decision_result: receipt.decision_result ?? "missing",
      partner_id: receipt.partner_id ?? "",
      policy_id: receipt.policy_id ?? "",
      decision_context: production_usable ? "production" : "sandbox_only"
    },
    { ...context, productionUsableRaw: receipt.production_usable }
  );
}

// ../../lib/partner/verifyPartnerFlowReceipt.ts
var SUPPORTED_RECEIPT_SCHEMA_VERSION = "1.0.0";
var EXPECTED_RECEIPT_ARTIFACT_TYPE = "eligibility_decision_receipt";
var SANDBOX_ONLY_INVALIDATION_REASON = "production_not_usable:false";
function validateSharedReceiptFields(receipt, expected) {
  const errors = [];
  const now = expected.now ?? /* @__PURE__ */ new Date();
  if (receipt.signature_valid !== true) {
    errors.push("signature_invalid");
  }
  if (receipt.decision_result !== "approved") {
    errors.push(`decision_not_approved:${receipt.decision_result ?? "missing"}`);
  }
  if (receipt.status !== "active") {
    errors.push(`status_not_active:${receipt.status ?? "missing"}`);
  }
  if (receipt.partner_id !== expected.partnerId) {
    errors.push(`partner_mismatch:expected=${expected.partnerId},got=${receipt.partner_id ?? "missing"}`);
  }
  if (receipt.policy_id !== expected.policyId) {
    errors.push(`policy_mismatch:expected=${expected.policyId},got=${receipt.policy_id ?? "missing"}`);
  }
  if (receipt.schema_version !== SUPPORTED_RECEIPT_SCHEMA_VERSION) {
    errors.push(`schema_version_unsupported:${receipt.schema_version ?? "missing"}`);
  }
  if (receipt.artifact_type !== EXPECTED_RECEIPT_ARTIFACT_TYPE) {
    errors.push(`artifact_type_mismatch:${receipt.artifact_type ?? "missing"}`);
  }
  if (receipt.expires_at == null || receipt.expires_at === "") {
    errors.push("expires_at_missing");
  } else {
    const expiresAt = new Date(receipt.expires_at);
    if (Number.isNaN(expiresAt.getTime())) {
      errors.push("expires_at_invalid");
    } else if (expiresAt.getTime() <= now.getTime()) {
      errors.push("receipt_expired");
    }
  }
  const claimRefs = receipt.evaluated_claim_refs ?? [];
  for (const ref of claimRefs) {
    const status = ref.status?.toLowerCase();
    if (status && status !== "active") {
      errors.push(`claim_not_active:${ref.claim_type ?? ref.claim_id ?? "unknown"}`);
    }
  }
  return errors;
}
function validateSandboxEnvironmentFields(receipt) {
  const errors = [];
  if (receipt.production_usable !== false) {
    errors.push(
      receipt.production_usable === void 0 ? "sandbox_production_usable_missing" : "sandbox_production_usable_not_false"
    );
  }
  if (receipt.decision_context !== "sandbox_only") {
    errors.push(`sandbox_decision_context_mismatch:${receipt.decision_context ?? "missing"}`);
  }
  const reasons = receipt.invalidation_reasons ?? [];
  if (reasons.length !== 1 || reasons[0] !== SANDBOX_ONLY_INVALIDATION_REASON) {
    errors.push("sandbox_invalidation_reason_mismatch");
  }
  return errors;
}
function validateCurrentValidityFields(receipt) {
  const errors = [];
  if (receipt.lifecycle_status === "superseded") errors.push("receipt_superseded");
  if (receipt.lifecycle_status === "revoked") errors.push("receipt_revoked");
  if (receipt.lifecycle_status === "expired") errors.push("receipt_expired");
  if (receipt.currently_valid === false) {
    const safe = receipt.partner_safe_reason;
    if (safe === "evidence_refresh_required") errors.push("evidence_refresh_required");
    else if (safe === "policy_no_longer_valid") errors.push("policy_no_longer_valid");
    else if (safe === "application_inactive") errors.push("application_inactive");
    else if (safe === "receipt_superseded") errors.push("receipt_superseded");
    else if (safe) errors.push(safe);
    else errors.push("currently_valid_not_true");
  }
  return errors;
}
function validateProductionEnvironmentFields(receipt) {
  const errors = [];
  errors.push(...validateCurrentValidityFields(receipt));
  if (receipt.production_usable !== true) {
    errors.push(
      receipt.production_usable === void 0 ? "production_usable_missing" : "production_usable_not_true"
    );
  }
  if (receipt.currently_valid !== true) {
    errors.push("currently_valid_not_true");
  }
  if (receipt.decision_context !== "production") {
    errors.push(`production_decision_context_mismatch:${receipt.decision_context ?? "missing"}`);
  }
  if ((receipt.invalidation_reasons ?? []).length > 0) {
    errors.push("production_has_invalidation_reasons");
  }
  return errors;
}
function validatePartnerFlowPublicReceipt(receipt, expected) {
  if (!receipt || typeof receipt !== "object") {
    return {
      ok: false,
      errors: ["receipt_missing"]
    };
  }
  if (expected.mode) {
    const sharedErrors = validateSharedReceiptFields(receipt, expected);
    const modeErrors = expected.mode === "sandbox" ? [...validateSandboxEnvironmentFields(receipt), ...validateCurrentValidityFields(receipt)] : validateProductionEnvironmentFields(receipt);
    const errors = [...sharedErrors, ...modeErrors];
    return { ok: errors.length === 0, errors };
  }
  const trust = evaluatePublicReceiptTrust(receipt, {
    partnerId: expected.partnerId,
    policyId: expected.policyId,
    allowSandbox: expected.allowSandbox,
    now: expected.now
  });
  return {
    ok: trust.currently_valid,
    errors: trust.invalidation_reasons,
    trust
  };
}

// shims/onchain-conformance-verify.ts
function evaluateConformance() {
  return { ok: false, reasons: ["chain_conformance_not_bundled"] };
}
function evaluateVectorConformance() {
  return { ok: false, reasons: ["chain_conformance_not_bundled"] };
}

// shims/onchain-conformance-vectors.ts
var CONFORMANCE_VECTOR_PACKAGE = "abraxas.conformance.vectors.unbundled";

// ../../lib/institutionalCertification/build546/independentVerifier.ts
var OFFLINE_CHECKS = [
  "payload_hash_recomputation",
  "ed25519_signature",
  "verification_key_registry",
  "policy_and_partner_binding",
  "artifact_schema",
  "not_before_expiry_window",
  "chain_vector_conformance"
];
var LIVE_CHECKS = [
  "current_revocation_status",
  "claim_dependency_refresh",
  "supersession",
  "live_chain_observation"
];
function verifyReceiptIndependently(input) {
  const now = input.now ?? /* @__PURE__ */ new Date();
  const env = input.env ?? {};
  const phases = [];
  const failure_codes = [];
  let cryptographically_authentic = false;
  let currently_authorizable = false;
  const push = (id, status, detail, code) => {
    phases.push({ id, status, detail });
    if (code && (status === "fail" || status === "blocked")) failure_codes.push(code);
  };
  if (input.signedRecord) {
    const record = input.signedRecord;
    const integrity = evaluateReceiptIntegrity(record);
    push(
      "payload_integrity",
      integrity.payload_hash_matches_recomputed ? "pass" : "fail",
      integrity.payload_hash_matches_recomputed ? "Canonical payload hash matches signed artifact." : "Payload hash mismatch \u2014 tampered receipt body.",
      integrity.payload_hash_matches_recomputed ? void 0 : "payload_tampered"
    );
    const keyResolved = resolveVerificationKey({
      keyId: record.signing_key_id,
      schemaVersion: record.schema_version,
      now,
      env
    });
    if (!keyResolved.ok) {
      push("issuer_key", "fail", `Signing key rejected: ${keyResolved.reason}`, keyResolved.reason);
    } else {
      push("issuer_key", "pass", `Trusted issuer key ${record.signing_key_id} (${keyResolved.key.status}).`);
    }
    const sigOk = verifyRecordSignatureWithRegistry(record, now, env);
    cryptographically_authentic = integrity.payload_hash_matches_recomputed && sigOk && keyResolved.ok;
    push(
      "signature_authenticity",
      sigOk && integrity.payload_hash_matches_recomputed ? "pass" : "fail",
      sigOk ? "Ed25519 signature verified against registry public key." : "Signature verification failed.",
      sigOk ? void 0 : "signature_invalid"
    );
  } else if (input.publicReceipt) {
    push(
      "signature_authenticity",
      "skipped",
      "Public view without full signed record \u2014 cannot recompute Ed25519 locally; use signedRecord for offline crypto proof."
    );
    cryptographically_authentic = input.publicReceipt.signature_valid === true;
  } else {
    push("input", "fail", "No receipt material supplied.", "receipt_missing");
  }
  const receiptView = input.publicReceipt ?? (input.signedRecord ? {
    receipt_id: input.signedRecord.id,
    schema_version: input.signedRecord.schema_version,
    partner_id: input.signedRecord.partner_id,
    policy_id: input.signedRecord.policy_id,
    decision_result: input.signedRecord.decision_result,
    signature_valid: cryptographically_authentic,
    expires_at: input.signedRecord.expires_at,
    status: input.signedRecord.status,
    production_usable: input.signedRecord.decision_context === "production",
    artifact_type: "eligibility_decision_receipt"
  } : null);
  const expectations = {
    partnerId: input.expectations.partnerId,
    policyId: input.expectations.policyId,
    now,
    allowSandbox: input.expectations.allowSandbox
  };
  if (receiptView) {
    const evaluatedAt = input.signedRecord?.evaluated_at;
    if (evaluatedAt) {
      const evaluatedMs = new Date(evaluatedAt).getTime();
      const future = !Number.isNaN(evaluatedMs) && evaluatedMs > now.getTime();
      push(
        "temporal_validity",
        future ? "fail" : "pass",
        future ? "Receipt evaluated_at is in the future relative to verifier clock." : "Issuance timestamp not in the future.",
        future ? "receipt_future_dated" : void 0
      );
    }
    const validation = validatePartnerFlowPublicReceipt(receiptView, expectations);
    push(
      "policy_scope",
      validation.ok ? "pass" : "fail",
      validation.ok ? "Partner and policy binding satisfied." : validation.errors.join("; "),
      validation.ok ? void 0 : validation.errors.join(";")
    );
    const audience = input.expectations.audiencePartnerId ?? input.expectations.partnerId;
    const audienceOk = receiptView.partner_id === audience;
    push(
      "audience_binding",
      audienceOk ? "pass" : "fail",
      audienceOk ? `Receipt audience partner ${receiptView.partner_id} matches relying party.` : `Cross-application misuse: expected partner ${audience}, got ${receiptView.partner_id ?? "missing"}.`,
      audienceOk ? void 0 : "audience_mismatch"
    );
    const trust = evaluatePublicReceiptTrust(receiptView, {
      partnerId: input.expectations.partnerId,
      policyId: input.expectations.policyId,
      allowSandbox: input.expectations.allowSandbox,
      now
    });
    push(
      "issuance_trust_fields",
      trust.signature_valid ? "pass" : "fail",
      trust.signature_valid ? "Trust evaluation accepts signature field." : trust.invalidation_reasons.join("; "),
      trust.signature_valid ? void 0 : "signature_invalid"
    );
    if (input.revocationSource?.available === false) {
      push(
        "revocation_freshness",
        "blocked",
        `Revocation source unavailable (${input.revocationSource.reason}) \u2014 cannot establish current validity.`,
        "revocation_source_unavailable"
      );
    } else if (input.revocationSource?.available === true && input.revocationSource.status === "revoked") {
      push("revocation_freshness", "fail", "Authority reports receipt revoked.", "receipt_revoked");
    } else if (input.revocationSource?.available === true) {
      push("revocation_freshness", "pass", "Authority reports receipt not revoked at check time.");
    } else {
      push(
        "revocation_freshness",
        "blocked",
        "No live revocation feed supplied \u2014 current validity not proven (signature-only insufficient).",
        "revocation_not_checked"
      );
    }
    const liveRevocationPass = phases.find((p) => p.id === "revocation_freshness")?.status === "pass";
    const validationPass = phases.find((p) => p.id === "policy_scope")?.status === "pass";
    const audiencePass = phases.find((p) => p.id === "audience_binding")?.status === "pass";
    const temporalPass = phases.find((p) => p.id === "temporal_validity")?.status !== "fail";
    currently_authorizable = cryptographically_authentic && trust.currently_valid && validationPass && audiencePass && temporalPass && liveRevocationPass === true;
  }
  if (input.chainPackage !== void 0) {
    if (input.chainRpcAvailable === false) {
      push("chain_evidence", "blocked", "Chain RPC unavailable \u2014 cannot validate live on-chain attestation.", "chain_rpc_failure");
    } else {
      const conformance = input.chainPackage === CONFORMANCE_VECTOR_PACKAGE ? evaluateVectorConformance() : evaluateConformance({
        raw: input.chainPackage,
        nowSeconds: Math.floor(now.getTime() / 1e3)});
      push(
        "chain_evidence",
        "fail",
        conformance.reasons.join("; "),
        "chain_mismatch"
      );
    }
  }
  const hasBlocked = phases.some((p) => p.status === "blocked");
  const hasFail = phases.some((p) => p.status === "fail");
  let verdict = "authorize";
  if (hasBlocked) verdict = "blocked";
  else if (hasFail || !currently_authorizable) verdict = "reject";
  return {
    verdict,
    cryptographically_authentic,
    currently_authorizable,
    phases,
    failure_codes,
    checks_possible_offline: [...OFFLINE_CHECKS],
    checks_requiring_live_authority: [...LIVE_CHECKS],
    disclaimer: "cryptographically_authentic proves signed artifact integrity. currently_authorizable requires explicit revocation/freshness evidence \u2014 never infer from signature alone."
  };
}
var BUILD_548_REPLAY_SCOPE = "single_use_partner_policy_receipt_v1";
function buildCanonicalReplayKey(scope) {
  const scopeId = scope.scope ?? BUILD_548_REPLAY_SCOPE;
  const material = [
    scopeId,
    scope.partnerId.trim(),
    scope.policyId.trim(),
    scope.receiptId.trim()
  ].join("\0");
  return createHash("sha256").update(material).digest("hex");
}
function consumptionIdForAttempt(scope, requestId) {
  return createHash("sha256").update(`${buildCanonicalReplayKey(scope)}:${requestId}`).digest("hex").slice(0, 24);
}

// ../../lib/institutionalCertification/build547/receiptConsumptionStore.ts
var InMemoryReceiptConsumptionStore = class {
  kind = "memory";
  consumed = /* @__PURE__ */ new Set();
  audit = [];
  async tryRecordConsumption(input) {
    const scope = {
      partnerId: input.partnerId,
      policyId: input.policyId,
      receiptId: input.receiptId
    };
    const replayKey = buildCanonicalReplayKey(scope);
    if (this.consumed.has(replayKey)) {
      return { status: "replay", consumption_id: null };
    }
    this.consumed.add(replayKey);
    const id = consumptionIdForAttempt(scope, input.requestId);
    this.audit.push({
      consumption_id: id,
      receipt_id: input.receiptId,
      request_id: input.requestId,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      recorded_at: input.at,
      instance_id: "memory"
    });
    return { status: "recorded", consumption_id: id };
  }
  async hasConsumed(scope) {
    return this.consumed.has(buildCanonicalReplayKey(scope));
  }
  async listAudit(limit = 100) {
    return this.audit.slice(-limit);
  }
};

// ../../lib/institutionalCertification/build546/externalRelyingParty.ts
var ExternalRelyingPartyHarness = class {
  constructor(config) {
    this.config = config;
    this.store = config.consumptionStore ?? new InMemoryReceiptConsumptionStore();
  }
  config;
  store;
  auditLog = [];
  getConsumptionStore() {
    return this.store;
  }
  getAuditLog() {
    return this.auditLog;
  }
  async decide(input) {
    const receiptId = input.signedRecord?.id ?? input.publicReceipt?.receipt_id ?? "unknown";
    const now = input.now ?? /* @__PURE__ */ new Date();
    const singleUse = input.singleUse !== false;
    const consumptionScope = {
      partnerId: this.config.partnerId,
      policyId: this.config.policyId,
      receiptId
    };
    const alreadyConsumed = singleUse && await this.store.hasConsumed(consumptionScope);
    if (alreadyConsumed) {
      const blocked = verifyReceiptIndependently({
        signedRecord: input.signedRecord,
        publicReceipt: input.publicReceipt,
        expectations: {
          partnerId: this.config.partnerId,
          policyId: this.config.policyId,
          allowSandbox: this.config.allowSandbox
        },
        now,
        env: this.config.env,
        revocationSource: input.revocationSource
      });
      const audit2 = {
        request_id: input.requestId,
        receipt_id: receiptId,
        at: now.toISOString(),
        outcome: "denied",
        verifier: blocked,
        authorization_verified: blocked.verdict === "authorize" && blocked.currently_authorizable,
        durable_consumption_marker: true,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: true,
        consumption_id: null,
        partner_visible: {
          result: "deny_replay",
          receipt_id: receiptId
        }
      };
      this.auditLog.push(audit2);
      return audit2;
    }
    const verifier = verifyReceiptIndependently({
      signedRecord: input.signedRecord,
      publicReceipt: input.publicReceipt,
      expectations: {
        partnerId: this.config.partnerId,
        policyId: this.config.policyId,
        allowSandbox: this.config.allowSandbox
      },
      now,
      env: this.config.env,
      revocationSource: input.revocationSource
    });
    let outcome = "denied";
    if (verifier.verdict === "blocked") outcome = "blocked";
    else if (verifier.verdict === "authorize" && verifier.currently_authorizable) outcome = "granted";
    const authorizationVerified = verifier.verdict === "authorize" && verifier.currently_authorizable;
    let consumptionRecorded = false;
    let replayDetected = false;
    let consumptionId = null;
    let durableConsumptionMarker = false;
    let durableAuditLogged = false;
    let auditAppendFailed = false;
    let persistenceUnavailable = false;
    if (outcome === "granted" && singleUse) {
      const attempt = await this.store.tryRecordConsumption({
        receiptId,
        requestId: input.requestId,
        partnerId: this.config.partnerId,
        policyId: this.config.policyId,
        at: now.toISOString()
      });
      if (attempt.status === "replay") {
        outcome = "denied";
        replayDetected = true;
        consumptionRecorded = false;
        durableConsumptionMarker = true;
      } else if (attempt.status === "persistence_unavailable") {
        outcome = "blocked";
        persistenceUnavailable = true;
        consumptionRecorded = false;
        durableConsumptionMarker = false;
        durableAuditLogged = false;
      } else if (attempt.status === "audit_append_failed") {
        outcome = "denied";
        auditAppendFailed = true;
        consumptionId = attempt.consumption_id;
        durableConsumptionMarker = true;
        durableAuditLogged = false;
        consumptionRecorded = false;
      } else {
        consumptionRecorded = true;
        consumptionId = attempt.consumption_id;
        durableConsumptionMarker = true;
        durableAuditLogged = true;
      }
    }
    const audit = {
      request_id: input.requestId,
      receipt_id: receiptId,
      at: now.toISOString(),
      outcome,
      verifier,
      authorization_verified: authorizationVerified,
      durable_consumption_marker: durableConsumptionMarker,
      durable_audit_logged: durableAuditLogged,
      consumption_recorded: consumptionRecorded,
      replay_detected: replayDetected,
      audit_append_failed: auditAppendFailed || void 0,
      persistence_unavailable: persistenceUnavailable || void 0,
      consumption_id: consumptionId,
      replay_key_scope: "single_use_partner_policy_receipt_v1",
      partner_visible: {
        result: outcome === "granted" ? "permit" : persistenceUnavailable ? "blocked_persistence_unavailable" : auditAppendFailed ? "deny_audit_incomplete" : replayDetected ? "deny_replay" : outcome === "blocked" ? "blocked" : "deny",
        receipt_id: receiptId,
        policy_id: this.config.policyId
      }
    };
    this.auditLog.push(audit);
    return audit;
  }
};

// ../../lib/institutionalVerification/reasonMapping.ts
var RECEIPT_CODE_MAP = {
  payload_tampered: "payload_tampered",
  signature_invalid: "signature_invalid",
  unknown_key: "issuer_untrusted",
  unknown_key_id: "issuer_untrusted",
  historical_not_allowed: "issuer_key_retired",
  expired: "expired",
  partner_mismatch: "tenant_partner_mismatch",
  policy_mismatch: "tenant_policy_mismatch",
  audience_mismatch: "audience_mismatch",
  revoked: "revoked",
  receipt_revoked: "revoked",
  revocation_unavailable: "revocation_unavailable",
  sandbox_not_allowed: "authorization_denied"
};
function mapReceiptFailureCodes(underlying) {
  const mapped = /* @__PURE__ */ new Set();
  for (const code of underlying.failure_codes) {
    const direct = RECEIPT_CODE_MAP[code];
    if (direct) {
      mapped.add(direct);
      continue;
    }
    if (code.includes("unknown_key")) mapped.add("issuer_untrusted");
    else if (code.includes("expired")) mapped.add("expired");
    else if (code.includes("partner")) mapped.add("tenant_partner_mismatch");
    else if (code.includes("policy")) mapped.add("tenant_policy_mismatch");
    else if (code.includes("revocation")) mapped.add("revocation_unavailable");
    else mapped.add("authorization_denied");
  }
  if (underlying.verdict === "blocked" && mapped.size === 0) {
    mapped.add("revocation_unavailable");
  }
  return Array.from(mapped);
}
function mapPresentationFailure(outcome) {
  const mapped = /* @__PURE__ */ new Set();
  if (outcome.replay_detected) mapped.add("replay_detected");
  if (outcome.unsigned_revocation_hint_rejected) mapped.add("portable_revocation_unsigned");
  if (outcome.portable_revocation_authenticated === false) {
    mapped.add("portable_revocation_unsigned");
  }
  for (const code of outcome.portable_revocation_codes ?? []) {
    if (code.includes("stale")) mapped.add("revocation_stale");
    else if (code.includes("issuer")) mapped.add("issuer_untrusted");
    else mapped.add("revocation_stale");
  }
  for (const code of outcome.presentation_binding_deny_codes ?? []) {
    mapped.add("presentation_binding_invalid");
  }
  for (const code of mapReceiptFailureCodes(outcome.verifier)) {
    mapped.add(code);
  }
  if (outcome.outcome !== "granted" && mapped.size === 0) {
    mapped.add("authorization_denied");
  }
  return Array.from(mapped);
}
function receiptVerdictFromUnderlying(underlying) {
  if (underlying.verdict === "authorize" && underlying.currently_authorizable) return "valid";
  if (underlying.verdict === "blocked") return "blocked";
  return "invalid";
}
function presentationVerdictFromOutcome(outcome) {
  if (outcome.outcome === "granted" && outcome.authorization_verified) return "valid";
  if (outcome.outcome === "blocked") return "blocked";
  return "invalid";
}

// ../../lib/protocol/proofFirst/holderPolicyPresentation.ts
var HOLDER_POLICY_PRESENTATION_MEDIA_TYPE = "application/vnd.abraxas.policy-scoped-presentation+json";
var HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION = "1.0.0";
var FORBIDDEN_TOP_LEVEL_KEYS = [
  "document",
  "biometric",
  "legal_name",
  "date_of_birth",
  "selfie",
  "passport_image",
  "raw_evidence"
];
function recordContainsForbiddenEvidenceFields(record) {
  const blob = JSON.stringify(record);
  for (const key of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (blob.includes(`"${key}"`)) return key;
  }
  for (const claim of record.evaluated_claim_refs) {
    if (claim.claim_type.includes("document") || claim.claim_type.includes("biometric")) {
      return "raw_claim_type";
    }
  }
  return null;
}
function assertPresentationExcludesSensitiveCustody(presentation) {
  const forbidden = recordContainsForbiddenEvidenceFields(presentation.signed_decision_receipt);
  if (forbidden) {
    return { ok: false, reason: `forbidden_field_leak:${forbidden}` };
  }
  if (presentation.disclosed_claim_refs.length === 0) {
    return { ok: false, reason: "no_claims_disclosed" };
  }
  const allowed = new Set(presentation.signed_decision_receipt.evaluated_claim_refs.map((c) => c.claim_id));
  for (const id of presentation.disclosed_claim_refs) {
    if (!allowed.has(id)) {
      return { ok: false, reason: "credential_substitution_claim" };
    }
  }
  if (presentation.signed_decision_receipt.partner_id !== presentation.audience_partner_id) {
    return { ok: false, reason: "audience_mismatch_at_compose" };
  }
  return { ok: true };
}

// ../../lib/protocol/proofFirst/presentationReceiptBinding.ts
function validatePresentationReceiptStrictBinding(input) {
  const deny = [];
  const { presentation, relyingParty } = input;
  const signed = presentation.signed_decision_receipt;
  if (presentation.media_type !== HOLDER_POLICY_PRESENTATION_MEDIA_TYPE) {
    deny.push("presentation_media_type_invalid");
  }
  if (presentation.schema_version !== HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION) {
    deny.push("presentation_schema_invalid");
  }
  if (presentation.policy_id !== signed.policy_id) {
    deny.push("presentation_policy_id_mismatch");
  }
  if (presentation.policy_version !== signed.policy_version) {
    deny.push("presentation_policy_version_mismatch");
  }
  if (presentation.audience_partner_id !== signed.partner_id) {
    deny.push("presentation_audience_mismatch");
  }
  if (signed.partner_id !== relyingParty.partnerId) {
    deny.push("presentation_rp_audience_mismatch");
  }
  if (signed.policy_id !== relyingParty.policyId) {
    deny.push("presentation_rp_policy_mismatch");
  }
  const excludedOk = presentation.excluded_data_classes.length === SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES.length && presentation.excluded_data_classes.every(
    (v, i) => v === SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES[i]
  );
  if (!excludedOk) {
    deny.push("presentation_excluded_classes_mismatch");
  }
  if (!presentation.disclosed_claim_refs.length) {
    deny.push("presentation_claim_ref_empty");
  }
  const allowed = new Set(signed.evaluated_claim_refs.map((c) => c.claim_id));
  for (const id of presentation.disclosed_claim_refs) {
    if (!allowed.has(id)) {
      deny.push("presentation_claim_ref_unbound");
      break;
    }
  }
  return deny.length ? { ok: false, deny_codes: deny } : { ok: true };
}

// ../../lib/protocol/portableRevocation/contract.ts
var PORTABLE_REVOCATION_MEDIA_TYPE = "application/vnd.abraxas.portable-revocation-snapshot+json";
var PORTABLE_REVOCATION_SCHEMA_VERSION = "1.0.0";
var PORTABLE_REVOCATION_KEY_SCHEMA = "1.0.0";

// ../../lib/protocol/portableRevocation/issuerAuthority.ts
function resolveAuthorizedRevocationIssuerForReceipt(receipt, policy) {
  if (!policy.bindings.length) {
    return { ok: false, code: "issuer_trust_unconfigured" };
  }
  const binding = policy.bindings.find(
    (row) => row.receipt_signing_key_id === receipt.signing_key_id
  );
  if (!binding) {
    return { ok: false, code: "receipt_signing_key_unbound" };
  }
  return {
    ok: true,
    revocation_issuer_id: binding.revocation_issuer_id,
    snapshot_signing_key_ids: binding.snapshot_signing_key_ids
  };
}

// ../../lib/protocol/portableRevocation/freshness.ts
var PORTABLE_REVOCATION_DEFAULT_CLOCK_SKEW_SECONDS = 300;
var PORTABLE_REVOCATION_MAX_FRESHNESS_SECONDS = 604800;
var PORTABLE_REVOCATION_MAX_STATUS_ENTRY_AGE_CAP_SECONDS = 604800;
function parseInstant(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}
function validatePortableRevocationFreshness(input) {
  const codes = [];
  const skewMs = (input.clockSkewSeconds ?? PORTABLE_REVOCATION_DEFAULT_CLOCK_SKEW_SECONDS) * 1e3;
  const nowMs = input.now.getTime();
  const { payload } = input;
  const issuedMs = parseInstant(payload.issued_at);
  const expiresMs = parseInstant(payload.expires_at);
  if (issuedMs === null || expiresMs === null) {
    codes.push("invalid_timestamp");
    return codes;
  }
  if (expiresMs <= issuedMs) {
    codes.push("invalid_expiry_window");
  }
  if (nowMs >= expiresMs) {
    codes.push("snapshot_expired");
  }
  if (issuedMs > nowMs + skewMs) {
    codes.push("snapshot_future_dated");
  }
  if (!Number.isInteger(payload.snapshot_sequence) || payload.snapshot_sequence < 1) {
    codes.push("invalid_sequence");
  }
  if (!Number.isFinite(payload.max_freshness_seconds) || payload.max_freshness_seconds <= 0 || payload.max_freshness_seconds > PORTABLE_REVOCATION_MAX_FRESHNESS_SECONDS) {
    codes.push("invalid_freshness_bounds");
  } else {
    const ageSec = (nowMs - issuedMs) / 1e3;
    if (ageSec > payload.max_freshness_seconds) {
      codes.push("snapshot_stale");
    }
  }
  if (!Number.isFinite(payload.max_status_entry_age_seconds) || payload.max_status_entry_age_seconds <= 0 || payload.max_status_entry_age_seconds > PORTABLE_REVOCATION_MAX_STATUS_ENTRY_AGE_CAP_SECONDS) {
    codes.push("invalid_freshness_bounds");
  }
  const seen = /* @__PURE__ */ new Set();
  for (const entry of payload.status_entries) {
    if (seen.has(entry.status_id)) {
      codes.push("duplicate_status_entry");
      break;
    }
    seen.add(entry.status_id);
    const updatedMs = parseInstant(entry.updated_at);
    if (updatedMs === null) {
      codes.push("invalid_timestamp");
      continue;
    }
    if (updatedMs > nowMs + skewMs) {
      codes.push("status_entry_future_dated");
    }
    if (updatedMs < issuedMs) {
      codes.push("invalid_status_entry");
    }
    const entryAgeSec = (nowMs - updatedMs) / 1e3;
    if (entryAgeSec > payload.max_status_entry_age_seconds) {
      codes.push("stale_status_entry");
    }
  }
  return codes;
}
function portableRevocationStatusId(receiptId, issuerId) {
  return createHash("sha256").update(`${issuerId.trim()}
${receiptId.trim()}`, "utf8").digest("hex");
}
function hashPortableRevocationPayload(payload) {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
function base64UrlDecode2(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - padded.length % 4);
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}
function verifyPortableRevocationSignature(input) {
  if (!input.publicKeyJwk.x) return false;
  const expectedHash = hashPortableRevocationPayload(input.artifact.payload);
  if (expectedHash !== input.artifact.payload_hash) return false;
  const pubKey = base64UrlDecode2(input.publicKeyJwk.x);
  let sig;
  try {
    sig = base64UrlDecode2(input.artifact.signature);
  } catch {
    return false;
  }
  if (sig.length !== nacl.sign.signatureLength) {
    return false;
  }
  const message = Buffer.from(input.artifact.payload_hash, "hex");
  return nacl.sign.detached.verify(message, sig, pubKey);
}

// ../../lib/protocol/portableRevocation/verify.ts
function verifyPortableRevocationArtifact(input) {
  const codes = [];
  const now = input.now ?? /* @__PURE__ */ new Date();
  const { artifact } = input;
  if (artifact.media_type !== PORTABLE_REVOCATION_MEDIA_TYPE) {
    codes.push("invalid_media_type");
  }
  if (artifact.payload.schema_version !== PORTABLE_REVOCATION_SCHEMA_VERSION) {
    codes.push("invalid_schema");
  }
  const recomputed = hashPortableRevocationPayload(artifact.payload);
  if (recomputed !== artifact.payload_hash) {
    codes.push("payload_hash_mismatch");
  }
  const keyResolved = resolveVerificationKey({
    keyId: artifact.payload.signing_key_id,
    schemaVersion: PORTABLE_REVOCATION_KEY_SCHEMA,
    now,
    env: input.env
  });
  if (!keyResolved.ok) {
    codes.push("unknown_signing_key");
  } else {
    const pub = toPublicReceiptJwk(keyResolved.key.public_jwk);
    if (!pub || !verifyPortableRevocationSignature({ artifact, publicKeyJwk: pub })) {
      codes.push("signature_invalid");
    }
  }
  if (input.previousArtifact) {
    const prevSeq = input.previousArtifact.payload.snapshot_sequence;
    if (artifact.payload.snapshot_sequence <= prevSeq) {
      codes.push("sequence_rollback");
    }
    const prevHash = hashPortableRevocationPayload(input.previousArtifact.payload);
    if (artifact.payload.previous_snapshot_hash !== prevHash) {
      codes.push("previous_hash_mismatch");
    }
  }
  return {
    ok: codes.length === 0,
    codes,
    snapshot_sequence: artifact.payload.snapshot_sequence,
    issuer_id: artifact.payload.issuer_id
  };
}

// ../../lib/protocol/portableRevocation/rpVerify.ts
function bootstrapMatches(artifact, trusted, authorizedIssuerId) {
  return trusted.revocation_issuer_id === authorizedIssuerId && trusted.snapshot_sequence === artifact.payload.snapshot_sequence && trusted.trusted_payload_hash === artifact.payload_hash && trusted.snapshot_signing_key_id === artifact.payload.signing_key_id;
}
function mapAdvanceFailure(code) {
  if (code === "rollback_rejected") return "rollback_against_checkpoint";
  if (code === "hash_conflict_at_sequence") return "hash_conflict_at_sequence";
  if (code === "chain_continuity_break") return "chain_continuity_break";
  if (code === "bootstrap_bypass_rejected") return "bootstrap_bypass_rejected";
  if (code === "checkpoint_unavailable") return "checkpoint_unavailable";
  if (code === "corrupt_checkpoint") return "checkpoint_storage_unavailable";
  return "checkpoint_storage_unavailable";
}
async function verifyPortableRevocationAtRelyingParty(input) {
  const now = input.now ?? /* @__PURE__ */ new Date();
  const codes = [];
  const bootstrapTrusts = input.bootstrapTrusts ?? [];
  const authority = resolveAuthorizedRevocationIssuerForReceipt(input.receipt, input.issuerTrust);
  if (!authority.ok) {
    codes.push(
      authority.code === "issuer_trust_unconfigured" ? "issuer_trust_unconfigured" : "issuer_authority_mismatch"
    );
    const verification2 = {
      ok: false,
      codes,
      snapshot_sequence: input.artifact.payload.snapshot_sequence,
      issuer_id: input.artifact.payload.issuer_id
    };
    return {
      verification: verification2,
      revocationSource: { available: false, reason: "unavailable" },
      checkpoint_advanced: false
    };
  }
  const crypto = verifyPortableRevocationArtifact({
    artifact: input.artifact,
    now,
    env: input.env
  });
  codes.push(...crypto.codes);
  codes.push(
    ...validatePortableRevocationFreshness({
      payload: input.artifact.payload,
      now,
      clockSkewSeconds: input.clockSkewSeconds
    })
  );
  if (input.artifact.payload.issuer_id !== authority.revocation_issuer_id) {
    codes.push("issuer_authority_mismatch");
  }
  if (!authority.snapshot_signing_key_ids.includes(input.artifact.payload.signing_key_id)) {
    codes.push("snapshot_signing_key_unauthorized");
  }
  let structuralOk = codes.length === 0;
  let checkpoint_advanced = false;
  if (structuralOk) {
    const bootstrapped = bootstrapTrusts.some(
      (row) => bootstrapMatches(input.artifact, row, authority.revocation_issuer_id)
    );
    const persistCheckpoint = input.advanceCheckpointOnSuccess !== false;
    const advance = await input.checkpointStore.compareAndAdvanceCheckpoint(
      {
        revocation_issuer_id: authority.revocation_issuer_id,
        highest_sequence: input.artifact.payload.snapshot_sequence,
        last_payload_hash: input.artifact.payload_hash,
        updated_at: now.toISOString(),
        previous_snapshot_hash: input.artifact.payload.previous_snapshot_hash,
        bootstrapped
      },
      { persist: persistCheckpoint }
    );
    if (!advance.ok) {
      codes.push(mapAdvanceFailure(advance.code));
      structuralOk = false;
    } else {
      checkpoint_advanced = persistCheckpoint && advance.advanced;
    }
  }
  const verification = {
    ok: structuralOk,
    codes,
    snapshot_sequence: input.artifact.payload.snapshot_sequence,
    issuer_id: authority.revocation_issuer_id
  };
  if (!structuralOk) {
    return {
      verification,
      revocationSource: { available: false, reason: "unavailable" },
      checkpoint_advanced: false
    };
  }
  const statusId = portableRevocationStatusId(
    input.receipt.id,
    authority.revocation_issuer_id
  );
  const entry = input.artifact.payload.status_entries.find((row) => row.status_id === statusId);
  if (!entry) {
    verification.ok = false;
    verification.codes.push("receipt_not_in_snapshot");
    return {
      verification,
      revocationSource: { available: false, reason: "unavailable" },
      checkpoint_advanced
    };
  }
  if (entry.state === "revoked") {
    verification.ok = false;
    verification.codes.push("receipt_revoked");
    return {
      verification,
      revocationSource: { available: true, status: "revoked" },
      checkpoint_advanced
    };
  }
  return {
    verification,
    revocationSource: { available: true, status: "active" },
    checkpoint_advanced
  };
}

// ../../lib/institutionalCertification/build546/fixtures.ts
generateTestSigningKeyPair("build546-primary");
generateTestSigningKeyPair("build546-retired");
generateTestSigningKeyPair("build546-unknown");

// ../../lib/protocol/proofFirst/portableRevocationStrict.ts
function snapshotLayerAuthenticated(codes) {
  return !codes.some(
    (code) => code !== "receipt_revoked" && code !== "receipt_not_in_snapshot"
  );
}
async function resolveStrictPortableRevocation(input) {
  const unsignedHint = input.revocationSource?.available === true && !input.portableRevocationSnapshot;
  if (!input.portableRevocationSnapshot) {
    return {
      revocationSource: { available: false, reason: "unavailable" },
      portable_revocation_authenticated: false,
      portable_revocation_verification: null,
      unsigned_revocation_hint_rejected: unsignedHint
    };
  }
  const portable = input.rp.portableRevocation;
  if (!portable) {
    const verification = {
      ok: false,
      codes: ["checkpoint_unavailable"],
      snapshot_sequence: input.portableRevocationSnapshot.payload.snapshot_sequence,
      issuer_id: input.portableRevocationSnapshot.payload.issuer_id
    };
    return {
      revocationSource: { available: false, reason: "unavailable" },
      portable_revocation_authenticated: false,
      portable_revocation_verification: verification,
      unsigned_revocation_hint_rejected: false
    };
  }
  const result = await verifyPortableRevocationAtRelyingParty({
    artifact: input.portableRevocationSnapshot,
    receipt: input.signed,
    now: input.now,
    env: input.rp.env,
    issuerTrust: portable.issuerTrust,
    checkpointStore: portable.checkpointStore,
    bootstrapTrusts: portable.bootstrapTrusts,
    clockSkewSeconds: portable.clockSkewSeconds,
    advanceCheckpointOnSuccess: portable.advanceCheckpointOnSuccess
  });
  return {
    revocationSource: result.revocationSource,
    portable_revocation_authenticated: snapshotLayerAuthenticated(result.verification.codes),
    portable_revocation_verification: result.verification,
    unsigned_revocation_hint_rejected: false
  };
}

// ../../lib/institutionalVerification/inspectOnly.ts
async function inspectSignedDecisionReceiptCryptography(input) {
  return verifyReceiptIndependently({
    signedRecord: input.signed_record,
    expectations: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox
    },
    now: input.now,
    env: input.trust_env,
    revocationSource: input.revocation_source
  });
}
async function inspectHolderPresentationCryptography(input) {
  const signed = input.presentation.signed_decision_receipt;
  const now = input.now ?? /* @__PURE__ */ new Date();
  const binding = validatePresentationReceiptStrictBinding({
    presentation: input.presentation,
    relyingParty: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id
    }
  });
  const custody = assertPresentationExcludesSensitiveCustody(input.presentation);
  const portable = await resolveStrictPortableRevocation({
    signed,
    now,
    rp: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox,
      env: input.trust_env,
      portableRevocation: input.portable_revocation
    },
    portableRevocationSnapshot: input.portable_revocation_snapshot,
    revocationSource: input.revocation_source
  });
  const verifier = verifyReceiptIndependently({
    signedRecord: signed,
    expectations: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox
    },
    now,
    env: input.trust_env,
    revocationSource: portable.revocationSource
  });
  return {
    binding_ok: binding.ok,
    binding_deny_codes: binding.ok ? [] : binding.deny_codes,
    custody_ok: custody.ok,
    portable_revocation_authenticated: portable.portable_revocation_authenticated,
    portable_revocation_codes: portable.portable_revocation_verification?.codes,
    verifier,
    consumption_side_effects: false
  };
}

// ../../lib/institutionalVerification/replayPolicy.ts
var INSTITUTIONAL_REPLAY_SEMANTICS = `
Single-use authorization binds (partner_id, policy_id, receipt_id). A durable consumption store
must survive process restarts and coordinate across instances (filesystem wx markers or postgres).
Inspection-only calls never write consumption markers. In-memory stores are rejected for
authorization unless allow_in_memory_consumption_for_tests is explicitly true (CI/fixtures only).
`.trim();
function requireConsumptionStoreForAuthorization(input) {
  const store = input.consumption_store;
  if (!store) {
    return { ok: false, code: "durable_store_required" };
  }
  if (store.kind === "memory" && input.allow_in_memory_consumption_for_tests !== true) {
    return { ok: false, code: "durable_store_required" };
  }
  return { ok: true, store };
}
function isDurableConsumptionStore(store) {
  return store.kind === "filesystem" || store.kind === "postgres";
}

// ../../lib/institutionalVerification/verifyDecisionReceipt.ts
function blockedResult(input) {
  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    verification_intent: input.intent,
    verdict: "blocked",
    authorize: false,
    rejection_reasons: input.rejection_reasons,
    detail_codes: input.rejection_reasons,
    offline_checks_completed: input.underlying.checks_possible_offline,
    live_checks_required: input.underlying.checks_requiring_live_authority,
    identity_database_required: false,
    abraxas_database_trust_root_required: false,
    underlying: input.underlying
  };
}
async function inspectSignedDecisionReceipt(input) {
  return verifySignedDecisionReceipt({
    ...input,
    verification_intent: "inspect_only"
  });
}
async function verifySignedDecisionReceipt(input) {
  const intent = input.verification_intent ?? "authorize";
  if (!input.signed_record?.id || !input.relying_party.partner_id || !input.relying_party.policy_id) {
    const underlying2 = verifyReceiptIndependently({
      signedRecord: input.signed_record,
      expectations: {
        partnerId: input.relying_party.partner_id ?? "",
        policyId: input.relying_party.policy_id ?? ""
      },
      now: input.now,
      env: input.trust_env
    });
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: intent,
      verdict: "invalid",
      authorize: false,
      rejection_reasons: ["malformed_input"],
      detail_codes: ["malformed_input"],
      offline_checks_completed: underlying2.checks_possible_offline,
      live_checks_required: underlying2.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      underlying: underlying2
    };
  }
  if (intent === "inspect_only") {
    const underlying2 = await inspectSignedDecisionReceiptCryptography({
      signed_record: input.signed_record,
      relying_party: input.relying_party,
      trust_env: input.trust_env,
      now: input.now,
      revocation_source: input.revocation_source
    });
    const verdict2 = receiptVerdictFromUnderlying(underlying2);
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: "inspect_only",
      verdict: verdict2,
      authorize: false,
      rejection_reasons: mapReceiptFailureCodes(underlying2),
      detail_codes: Array.from(underlying2.failure_codes),
      offline_checks_completed: underlying2.checks_possible_offline,
      live_checks_required: underlying2.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      underlying: underlying2
    };
  }
  const storeRequirement = requireConsumptionStoreForAuthorization({
    consumption_store: input.consumption_store,
    allow_in_memory_consumption_for_tests: input.allow_in_memory_consumption_for_tests
  });
  if (!storeRequirement.ok) {
    const underlying2 = verifyReceiptIndependently({
      signedRecord: input.signed_record,
      expectations: {
        partnerId: input.relying_party.partner_id,
        policyId: input.relying_party.policy_id,
        allowSandbox: input.relying_party.allow_sandbox
      },
      now: input.now,
      env: input.trust_env,
      revocationSource: input.revocation_source
    });
    return blockedResult({
      underlying: underlying2,
      rejection_reasons: ["durable_store_required"],
      intent: "authorize"
    });
  }
  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.relying_party.partner_id,
    policyId: input.relying_party.policy_id,
    allowSandbox: input.relying_party.allow_sandbox,
    env: input.trust_env,
    consumptionStore: storeRequirement.store
  });
  const audit = await harness.decide({
    requestId: input.request_id,
    signedRecord: input.signed_record,
    now: input.now,
    revocationSource: input.revocation_source,
    singleUse: input.enforce_single_use !== false
  });
  const underlying = audit.verifier;
  const verdict = audit.replay_detected ? "invalid" : receiptVerdictFromUnderlying(underlying);
  const rejection_reasons = audit.replay_detected ? ["replay_detected"] : mapReceiptFailureCodes(underlying);
  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    verification_intent: "authorize",
    verdict,
    authorize: audit.outcome === "granted" && audit.authorization_verified,
    rejection_reasons: Array.from(rejection_reasons),
    detail_codes: Array.from(underlying.failure_codes),
    offline_checks_completed: underlying.checks_possible_offline,
    live_checks_required: underlying.checks_requiring_live_authority,
    identity_database_required: false,
    abraxas_database_trust_root_required: false,
    underlying
  };
}

// ../../lib/protocol/proofFirst/proofFirstRelyingParty.ts
function partnerFlowViewFromSignedRecord(record, now, expectations, env) {
  const pub = toPublicView2(record);
  const signatureValid = verifyRecordSignatureWithRegistry(record, now, env);
  const pubForTrust = { ...pub, signature_valid: signatureValid };
  const trust = evaluatePublicReceiptTrust(pubForTrust, {
    partnerId: expectations.partnerId,
    policyId: expectations.policyId,
    now
  });
  return {
    ...pubForTrust,
    currently_valid: trust.currently_valid,
    signature_valid: trust.signature_valid,
    validity: trust.validity,
    issued_valid: trust.currently_valid,
    lifecycle_status: trust.currently_valid ? "active" : trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    validity_checked_at: now.toISOString()
  };
}
function preflightRejectOutcome(input) {
  const publicReceipt = partnerFlowViewFromSignedRecord(
    input.signed,
    input.now,
    { partnerId: input.signed.partner_id, policyId: input.signed.policy_id },
    input.rp.env
  );
  const verifier = verifyReceiptIndependently({
    signedRecord: input.signed,
    publicReceipt,
    expectations: {
      partnerId: input.rp.partnerId,
      policyId: input.rp.policyId,
      allowSandbox: input.rp.allowSandbox
    },
    now: input.now,
    env: input.rp.env,
    revocationSource: input.revocationSource
  });
  return {
    request_id: input.requestId,
    receipt_id: input.signed.id,
    at: input.now.toISOString(),
    outcome: "denied",
    verifier,
    authorization_verified: false,
    durable_consumption_marker: false,
    durable_audit_logged: false,
    consumption_recorded: false,
    replay_detected: false,
    consumption_id: null,
    partner_visible: {
      result: input.partnerResult,
      receipt_id: input.signed.id,
      policy_id: input.rp.policyId,
      binding_deny_codes: input.denyCodes.join(",")
    },
    presentation_binding_ok: input.bindingOk,
    presentation_binding_deny_codes: input.denyCodes,
    consumption_skipped_preflight_reject: true,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: verifier.checks_possible_offline,
    live_authority_checks: verifier.checks_requiring_live_authority,
    portable_revocation_authenticated: input.portableMeta?.portable_revocation_authenticated ?? false,
    portable_revocation_codes: input.portableMeta?.portable_revocation_codes,
    unsigned_revocation_hint_rejected: input.portableMeta?.unsigned_revocation_hint_rejected ?? false
  };
}
function finalizeOutcome(audit, bindingOk, portableMeta) {
  return {
    ...audit,
    presentation_binding_ok: bindingOk,
    consumption_skipped_preflight_reject: false,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: audit.verifier.checks_possible_offline,
    live_authority_checks: audit.verifier.checks_requiring_live_authority,
    portable_revocation_authenticated: portableMeta.portable_revocation_authenticated,
    portable_revocation_codes: portableMeta.portable_revocation_codes,
    unsigned_revocation_hint_rejected: portableMeta.unsigned_revocation_hint_rejected
  };
}
async function verifyHolderPresentationAtRelyingParty(input) {
  const signed = input.presentation.signed_decision_receipt;
  const now = input.now ?? /* @__PURE__ */ new Date();
  const portableRevocation = await resolveStrictPortableRevocation({
    signed,
    now,
    rp: input.rp,
    portableRevocationSnapshot: input.portableRevocationSnapshot,
    revocationSource: input.revocationSource
  });
  const revocationSource = portableRevocation.revocationSource;
  const portableMeta = {
    portable_revocation_authenticated: portableRevocation.portable_revocation_authenticated,
    portable_revocation_codes: portableRevocation.portable_revocation_verification?.codes,
    unsigned_revocation_hint_rejected: portableRevocation.unsigned_revocation_hint_rejected
  };
  const binding = validatePresentationReceiptStrictBinding({
    presentation: input.presentation,
    relyingParty: { partnerId: input.rp.partnerId, policyId: input.rp.policyId }
  });
  if (!binding.ok) {
    return preflightRejectOutcome({
      requestId: input.requestId,
      signed,
      now,
      rp: input.rp,
      revocationSource,
      denyCodes: binding.deny_codes,
      partnerResult: "deny_presentation_binding",
      bindingOk: false,
      portableMeta
    });
  }
  const custody = assertPresentationExcludesSensitiveCustody(input.presentation);
  if (!custody.ok) {
    return preflightRejectOutcome({
      requestId: input.requestId,
      signed,
      now,
      rp: input.rp,
      revocationSource,
      denyCodes: [custody.reason],
      partnerResult: custody.reason,
      bindingOk: true,
      portableMeta
    });
  }
  const harness = input.harness ?? new ExternalRelyingPartyHarness({
    partnerId: input.rp.partnerId,
    policyId: input.rp.policyId,
    allowSandbox: input.rp.allowSandbox,
    env: input.rp.env
  });
  const audit = await harness.decide({
    requestId: input.requestId,
    signedRecord: signed,
    publicReceipt: partnerFlowViewFromSignedRecord(
      signed,
      now,
      { partnerId: signed.partner_id, policyId: signed.policy_id },
      input.rp.env
    ),
    now,
    revocationSource
  });
  return finalizeOutcome(audit, true, portableMeta);
}

// ../../lib/institutionalVerification/verifyPresentation.ts
async function inspectHolderTrustPresentation(input) {
  return verifyHolderTrustPresentation({
    ...input,
    verification_intent: "inspect_only"
  });
}
async function verifyHolderTrustPresentation(input) {
  const intent = input.verification_intent ?? "authorize";
  if (!input.presentation?.signed_decision_receipt?.id) {
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: intent,
      verdict: "invalid",
      authorize: false,
      rejection_reasons: ["malformed_input"],
      detail_codes: ["malformed_input"],
      offline_checks_completed: [],
      live_checks_required: [],
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      replay_detected: false,
      portable_revocation_authenticated: false,
      underlying: {
        request_id: input.request_id,
        receipt_id: "unknown",
        at: (input.now ?? /* @__PURE__ */ new Date()).toISOString(),
        outcome: "denied",
        verifier: {
          verdict: "reject",
          cryptographically_authentic: false,
          currently_authorizable: false,
          phases: [],
          failure_codes: ["malformed_input"],
          checks_possible_offline: [],
          checks_requiring_live_authority: [],
          disclaimer: ""
        },
        authorization_verified: false,
        durable_consumption_marker: false,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: false,
        consumption_id: null,
        partner_visible: { result: "malformed_input" },
        abraxas_infrastructure_required: false,
        identity_database_required: false,
        retained_documents_required: false,
        offline_crypto_checks: [],
        live_authority_checks: [],
        presentation_binding_ok: false
      }
    };
  }
  if (intent === "inspect_only") {
    const inspected = await inspectHolderPresentationCryptography({
      presentation: input.presentation,
      relying_party: input.relying_party,
      trust_env: input.trust_env,
      portable_revocation_snapshot: input.portable_revocation_snapshot,
      portable_revocation: {
        issuerTrust: input.portable_revocation_issuer_trust,
        checkpointStore: input.checkpoint_store,
        bootstrapTrusts: input.portable_revocation_bootstrap_trusts ?? [],
        advanceCheckpointOnSuccess: false
      },
      now: input.now
    });
    const underlying = inspected.verifier;
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: "inspect_only",
      verdict: receiptVerdictFromUnderlying(underlying) === "valid" && inspected.binding_ok && inspected.custody_ok ? "valid" : "invalid",
      authorize: false,
      rejection_reasons: [
        ...!inspected.binding_ok ? ["presentation_binding_invalid"] : [],
        ...mapPresentationFailure({
          request_id: input.request_id,
          receipt_id: input.presentation.signed_decision_receipt.id,
          at: (input.now ?? /* @__PURE__ */ new Date()).toISOString(),
          outcome: "denied",
          verifier: underlying,
          replay_detected: false,
          offline_crypto_checks: underlying.checks_possible_offline,
          live_authority_checks: underlying.checks_requiring_live_authority,
          presentation_binding_ok: inspected.binding_ok,
          presentation_binding_deny_codes: inspected.binding_deny_codes,
          portable_revocation_authenticated: inspected.portable_revocation_authenticated,
          portable_revocation_codes: inspected.portable_revocation_codes,
          unsigned_revocation_hint_rejected: false
        })
      ],
      detail_codes: [
        ...underlying.failure_codes,
        ...inspected.portable_revocation_codes ?? [],
        ...inspected.binding_deny_codes ?? []
      ],
      offline_checks_completed: underlying.checks_possible_offline,
      live_checks_required: underlying.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      replay_detected: false,
      portable_revocation_authenticated: inspected.portable_revocation_authenticated ?? false,
      underlying: {
        request_id: input.request_id,
        receipt_id: input.presentation.signed_decision_receipt.id,
        at: (input.now ?? /* @__PURE__ */ new Date()).toISOString(),
        outcome: "denied",
        verifier: underlying,
        authorization_verified: false,
        durable_consumption_marker: false,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: false,
        consumption_id: null,
        partner_visible: { result: "inspect_only" },
        abraxas_infrastructure_required: false,
        identity_database_required: false,
        retained_documents_required: false,
        offline_crypto_checks: underlying.checks_possible_offline,
        live_authority_checks: underlying.checks_requiring_live_authority,
        presentation_binding_ok: inspected.binding_ok,
        presentation_binding_deny_codes: inspected.binding_deny_codes,
        portable_revocation_authenticated: inspected.portable_revocation_authenticated,
        portable_revocation_codes: inspected.portable_revocation_codes,
        unsigned_revocation_hint_rejected: false
      }
    };
  }
  const storeRequirement = requireConsumptionStoreForAuthorization({
    consumption_store: input.consumption_store,
    allow_in_memory_consumption_for_tests: input.allow_in_memory_consumption_for_tests
  });
  if (!storeRequirement.ok) {
    const underlying = verifyReceiptIndependently({
      signedRecord: input.presentation.signed_decision_receipt,
      expectations: {
        partnerId: input.relying_party.partner_id,
        policyId: input.relying_party.policy_id,
        allowSandbox: input.relying_party.allow_sandbox
      },
      now: input.now,
      env: input.trust_env
    });
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: "authorize",
      verdict: "blocked",
      authorize: false,
      rejection_reasons: ["durable_store_required"],
      detail_codes: ["durable_store_required"],
      offline_checks_completed: underlying.checks_possible_offline,
      live_checks_required: underlying.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      replay_detected: false,
      portable_revocation_authenticated: false,
      underlying: {
        request_id: input.request_id,
        receipt_id: input.presentation.signed_decision_receipt.id,
        at: (input.now ?? /* @__PURE__ */ new Date()).toISOString(),
        outcome: "blocked",
        verifier: underlying,
        authorization_verified: false,
        durable_consumption_marker: false,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: false,
        consumption_id: null,
        partner_visible: { result: "durable_store_required" },
        abraxas_infrastructure_required: false,
        identity_database_required: false,
        retained_documents_required: false,
        offline_crypto_checks: underlying.checks_possible_offline,
        live_authority_checks: underlying.checks_requiring_live_authority,
        presentation_binding_ok: false
      }
    };
  }
  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.relying_party.partner_id,
    policyId: input.relying_party.policy_id,
    allowSandbox: input.relying_party.allow_sandbox,
    env: input.trust_env,
    consumptionStore: storeRequirement.store
  });
  const outcome = await verifyHolderPresentationAtRelyingParty({
    presentation: input.presentation,
    requestId: input.request_id,
    now: input.now,
    portableRevocationSnapshot: input.portable_revocation_snapshot,
    rp: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox,
      env: input.trust_env,
      portableRevocation: {
        issuerTrust: input.portable_revocation_issuer_trust,
        checkpointStore: input.checkpoint_store,
        bootstrapTrusts: input.portable_revocation_bootstrap_trusts ?? [],
        advanceCheckpointOnSuccess: input.advance_revocation_checkpoint ?? true
      }
    },
    harness
  });
  const verdict = presentationVerdictFromOutcome(outcome);
  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    verification_intent: "authorize",
    verdict,
    authorize: outcome.outcome === "granted" && outcome.authorization_verified,
    rejection_reasons: mapPresentationFailure(outcome),
    detail_codes: [
      ...outcome.verifier.failure_codes,
      ...outcome.portable_revocation_codes ?? [],
      ...outcome.presentation_binding_deny_codes ?? []
    ],
    offline_checks_completed: outcome.offline_crypto_checks,
    live_checks_required: outcome.live_authority_checks,
    identity_database_required: false,
    abraxas_database_trust_root_required: false,
    replay_detected: outcome.replay_detected,
    portable_revocation_authenticated: outcome.portable_revocation_authenticated ?? false,
    underlying: outcome
  };
}

// ../../lib/institutionalVerification/crossApplication.ts
async function verifyCrossApplicationPresentation(input) {
  const shared = {
    presentation: input.presentation,
    portable_revocation_snapshot: input.portable_revocation_snapshot,
    now: input.now,
    trust_env: input.trust_env,
    portable_revocation_issuer_trust: input.portable_revocation_issuer_trust,
    portable_revocation_bootstrap_trusts: input.portable_revocation_bootstrap_trusts,
    checkpoint_store: input.checkpoint_store,
    consumption_store: input.consumption_store,
    allow_in_memory_consumption_for_tests: input.allow_in_memory_consumption_for_tests
  };
  const authorized_application = await verifyHolderTrustPresentation({
    ...shared,
    relying_party: input.authorized_scope,
    request_id: `${input.request_id_prefix}_authorized`
  });
  const other_application = await verifyHolderTrustPresentation({
    ...shared,
    relying_party: input.unauthorized_scope,
    request_id: `${input.request_id_prefix}_other`
  });
  const isolation_preserved = authorized_application.authorize === true && other_application.authorize === false && other_application.rejection_reasons.some(
    (reason) => reason === "tenant_partner_mismatch" || reason === "tenant_policy_mismatch" || reason === "audience_mismatch" || reason === "presentation_binding_invalid" || reason === "authorization_denied"
  );
  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    authorized_application,
    other_application,
    isolation_preserved
  };
}

export { INSTITUTIONAL_REPLAY_SEMANTICS, INSTITUTIONAL_VERIFICATION_CONTRACT_ID, INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION, PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV, PORTABLE_REVOCATION_ISSUER_TRUST_ENV, RECEIPT_TRUST_DIGEST_VERSION, buildInstitutionalVerificationContractDocument, digestReceiptVerificationKeyDocument, digestReceiptVerificationTrustKeys, fetchVerifiedReceiptKeyDocument, inspectHolderTrustPresentation, inspectSignedDecisionReceipt, isDurableConsumptionStore, mapPresentationFailure, mapReceiptFailureCodes, presentationVerdictFromOutcome, receiptVerdictFromUnderlying, requireConsumptionStoreForAuthorization, resolveInstitutionalTrustEnv, validateFetchedReceiptKeyDocument, validateInstitutionReceiptVerificationRegistryJson, verifyCrossApplicationPresentation, verifyHolderTrustPresentation, verifySignedDecisionReceipt };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map