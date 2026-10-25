'use strict';

var crypto = require('crypto');
var nacl = require('tweetnacl');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var nacl__default = /*#__PURE__*/_interopDefault(nacl);

// src/types.ts
var TRUST_ANCHOR_BUNDLE_DOCUMENT = "abraxas_trust_anchor_bundle";
var TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION = "1.0.0";
var ISSUER_AUTHORITY_STATEMENT_DOCUMENT = "abraxas_issuer_authority_statement";
var ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION = "1.0.0";
var RECEIPT_STATUS_EVIDENCE_DOCUMENT = "abraxas_receipt_status_evidence";
var RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION = "1.0.0";
var RECEIPT_STATUS_STATEMENT_DOCUMENT = "abraxas_signed_receipt_status_statement";
var RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION = "1.0.0";
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
function hashIssuerAuthorityPayload(payload) {
  const canonical = canonicalizeJson(payload);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}
function buildCanonicalPayloadFromRecord(record) {
  return {
    schema_version: record.schema_version,
    receipt_id: record.id,
    decision_id: record.verification_decision_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    consent_receipt_id: record.consent_receipt_id,
    decision_result: record.decision_result,
    reason_codes: [...record.reason_codes].sort(),
    evaluated_claim_refs: [...record.evaluated_claim_refs].map((ref) => ({
      claim_id: ref.claim_id,
      claim_type: ref.claim_type,
      issuer_id: ref.issuer_id,
      status: ref.status,
      issued_at: ref.issued_at,
      expires_at: ref.expires_at
    })).sort((a, b) => a.claim_id.localeCompare(b.claim_id)),
    issuer_refs: [...record.issuer_refs].sort(),
    decision_context: record.decision_context,
    evaluated_at: normalizeDecisionReceiptTimestamp(record.evaluated_at),
    expires_at: record.expires_at ? normalizeDecisionReceiptTimestamp(record.expires_at) : null
  };
}
function hashCanonicalPayload(payload) {
  const canonical = canonicalizeJson(payload);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}
function publicEd25519JwkFingerprint(jwk) {
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || !jwk.x) {
    return null;
  }
  return crypto.createHash("sha256").update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x })).digest("hex");
}

// src/trustAnchorBundle.ts
function validateTrustAnchorBundle(bundle) {
  if (bundle.document !== TRUST_ANCHOR_BUNDLE_DOCUMENT) {
    return { ok: false, reason: "invalid_trust_bundle_document" };
  }
  if (bundle.schema_version !== TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported_trust_bundle_schema" };
  }
  if (!bundle.anchor_key_id?.trim()) {
    return { ok: false, reason: "anchor_key_id_missing" };
  }
  const fp = publicEd25519JwkFingerprint(bundle.public_jwk);
  if (!fp) return { ok: false, reason: "invalid_anchor_public_jwk" };
  if (fp !== bundle.public_key_fingerprint) {
    return { ok: false, reason: "anchor_fingerprint_mismatch" };
  }
  if (!Number.isFinite(bundle.statement_cache_max_age_seconds) || bundle.statement_cache_max_age_seconds <= 0) {
    return { ok: false, reason: "invalid_statement_cache_policy" };
  }
  const statusMaxAge = bundle.status_statement_max_age_seconds ?? bundle.statement_cache_max_age_seconds;
  if (!Number.isFinite(statusMaxAge) || statusMaxAge <= 0) {
    return { ok: false, reason: "invalid_status_statement_cache_policy" };
  }
  return { ok: true };
}
function assertStatementMatchesPinnedAnchor(input) {
  if (input.statementAnchorKeyId !== input.bundle.anchor_key_id) {
    return { ok: false, reason: "anchor_substitution_rejected" };
  }
  return { ok: true };
}
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - padded.length % 4);
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}
function ed25519PublicFromJwk(jwk) {
  if (!jwk.x) return null;
  const bytes = base64UrlDecode(jwk.x);
  if (bytes.length !== 32) return null;
  return bytes;
}
function verifyEd25519Detached(input) {
  const pub = ed25519PublicFromJwk(input.publicJwk);
  if (!pub) return false;
  let sig;
  try {
    sig = base64UrlDecode(input.signatureBase64Url);
  } catch {
    return false;
  }
  if (sig.length !== nacl__default.default.sign.signatureLength) return false;
  return nacl__default.default.sign.detached.verify(input.message, sig, pub);
}

// src/issuerAuthorityStatement.ts
function inWindow(key, now, mode) {
  const nowMs = now.getTime();
  const notBefore = Date.parse(key.not_before);
  if (Number.isNaN(notBefore) || nowMs < notBefore) return "not_yet_valid";
  if (mode === "current_authorization") {
    if (key.status === "revoked") return "revoked";
    if (key.status !== "active") return "issuer_not_active";
    if (key.expires_at) {
      const exp = Date.parse(key.expires_at);
      if (!Number.isNaN(exp) && nowMs >= exp) return "issuer_expired";
    }
    return null;
  }
  if (key.status === "active") {
    if (key.expires_at) {
      const exp = Date.parse(key.expires_at);
      if (!Number.isNaN(exp) && nowMs >= exp) return "issuer_expired";
    }
    return null;
  }
  if (key.status === "retiring" || key.status === "retired" || key.status === "revoked") {
    if (!key.allow_historical_verification) return "historical_not_allowed";
    if (key.historical_verify_until) {
      const until = Date.parse(key.historical_verify_until);
      if (!Number.isNaN(until) && nowMs >= until) return "historical_window_closed";
    }
    return null;
  }
  return "revoked";
}
function verifySignedIssuerAuthorityStatement(input) {
  const { statement, trustAnchorPublicJwk } = input;
  const expectedHash = hashIssuerAuthorityPayload(statement.payload);
  if (expectedHash !== statement.payload_hash) {
    return { ok: false, reason: "statement_payload_hash_mismatch" };
  }
  if (statement.anchor_key_id !== statement.payload.anchor_key_id) {
    return { ok: false, reason: "anchor_key_id_mismatch" };
  }
  const pub = ed25519PublicFromJwk(trustAnchorPublicJwk);
  if (!pub) return { ok: false, reason: "invalid_anchor_public_jwk" };
  const message = Buffer.from(statement.payload_hash, "hex");
  if (!verifyEd25519Detached({
    message,
    signatureBase64Url: statement.signature,
    publicJwk: trustAnchorPublicJwk
  })) {
    return { ok: false, reason: "statement_signature_invalid" };
  }
  const min = input.minimumRegistryVersion;
  if (min != null && statement.payload.registry_version < min) {
    return { ok: false, reason: "registry_version_rollback_rejected" };
  }
  if (statement.payload.supersedes_registry_version != null && statement.payload.registry_version <= statement.payload.supersedes_registry_version) {
    return { ok: false, reason: "registry_version_not_advanced" };
  }
  const issuedAt = Date.parse(statement.payload.issued_at);
  if (!Number.isNaN(issuedAt) && issuedAt > Date.now() + 6e4) {
    return { ok: false, reason: "statement_issued_in_future" };
  }
  return { ok: true };
}
function resolveIssuerKeyFromSignedStatement(input) {
  const verified = verifySignedIssuerAuthorityStatement({
    statement: input.statement,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    minimumRegistryVersion: input.minimumRegistryVersion,
    now: input.now
  });
  if (!verified.ok) return verified;
  const payload = input.statement.payload;
  if (payload.environment !== input.environment) {
    return { ok: false, reason: "wrong_environment" };
  }
  const key = payload.keys.find((k) => k.key_id === input.keyId);
  if (!key) return { ok: false, reason: "unknown_key" };
  if (key.environment !== input.environment) return { ok: false, reason: "wrong_environment" };
  if (!key.schema_versions.includes(input.schemaVersion)) {
    return { ok: false, reason: "schema_mismatch" };
  }
  const windowReason = inWindow(key, input.now ?? /* @__PURE__ */ new Date(), input.mode);
  if (windowReason) return { ok: false, reason: windowReason };
  return { ok: true, key, registry_version: payload.registry_version };
}
function signIssuerAuthorityPayloadForTests(input) {
  if (!input.anchorPrivateJwk.d) throw new Error("anchor_private_jwk_required");
  const payloadHash = hashIssuerAuthorityPayload(input.payload);
  const seed = base64UrlDecode(input.anchorPrivateJwk.d);
  const keyPair = nacl__default.default.sign.keyPair.fromSeed(seed);
  const message = Buffer.from(payloadHash, "hex");
  const signature = nacl__default.default.sign.detached(message, keyPair.secretKey);
  return {
    payload: input.payload,
    payload_hash: payloadHash,
    signature: Buffer.from(signature).toString("base64url"),
    anchor_key_id: input.payload.anchor_key_id
  };
}

// src/receiptVerify.ts
function verifyReceiptPayloadIntegrity(record) {
  const payload = buildCanonicalPayloadFromRecord(record);
  return hashCanonicalPayload(payload) === record.payload_hash;
}
function verifyReceiptSignatureWithPublicJwk(record, publicJwk) {
  buildCanonicalPayloadFromRecord(record);
  const message = Buffer.from(record.payload_hash, "hex");
  return verifyEd25519Detached({
    message,
    signatureBase64Url: record.signature,
    publicJwk
  });
}
function hashReceiptStatusStatementPayload(payload) {
  const canonical = canonicalizeJson(payload);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}
function resolveStatusSigner(statement, keyId, environment, now) {
  const signers = statement.payload.status_signers ?? [];
  const key = signers.find((s) => s.key_id === keyId);
  if (!key) return { ok: false, reason: "unknown_status_signer" };
  if (key.environment !== environment) return { ok: false, reason: "wrong_environment" };
  if (key.status === "revoked") return { ok: false, reason: "status_signer_revoked" };
  if (key.status !== "active") return { ok: false, reason: "status_signer_not_active" };
  const notBefore = Date.parse(key.not_before);
  if (Number.isNaN(notBefore) || now.getTime() < notBefore) return { ok: false, reason: "status_signer_not_yet_valid" };
  if (key.expires_at) {
    const exp = Date.parse(key.expires_at);
    if (!Number.isNaN(exp) && now.getTime() >= exp) return { ok: false, reason: "status_signer_expired" };
  }
  return { ok: true, key };
}
function verifySignedReceiptStatusStatement(input) {
  const now = input.now ?? /* @__PURE__ */ new Date();
  const { signedStatus } = input;
  const expectedHash = hashReceiptStatusStatementPayload(signedStatus.payload);
  if (expectedHash !== signedStatus.payload_hash) {
    return { ok: false, reason: "status_statement_payload_hash_mismatch" };
  }
  if (signedStatus.status_signer_key_id !== signedStatus.payload.status_signer_key_id) {
    return { ok: false, reason: "status_signer_key_id_mismatch" };
  }
  const signer = resolveStatusSigner(
    input.signedIssuerAuthority,
    signedStatus.status_signer_key_id,
    signedStatus.payload.environment,
    now
  );
  if (!signer.ok) return signer;
  const message = Buffer.from(signedStatus.payload_hash, "hex");
  if (!verifyEd25519Detached({
    message,
    signatureBase64Url: signedStatus.signature,
    publicJwk: signer.key.public_jwk
  })) {
    return { ok: false, reason: "status_statement_signature_invalid" };
  }
  const issuedAt = Date.parse(signedStatus.payload.issued_at);
  if (!Number.isNaN(issuedAt) && issuedAt > Date.now() + 6e4) {
    return { ok: false, reason: "status_statement_issued_in_future" };
  }
  const expiresAt = Date.parse(signedStatus.payload.statement_expires_at);
  if (Number.isNaN(expiresAt) || now.getTime() >= expiresAt) {
    return { ok: false, reason: "status_statement_expired" };
  }
  const min = input.minimumStatusVersion;
  if (min != null && signedStatus.payload.status_version < min) {
    return { ok: false, reason: "status_version_rollback_rejected" };
  }
  if (signedStatus.payload.supersedes_status_version != null && signedStatus.payload.status_version <= signedStatus.payload.supersedes_status_version) {
    return { ok: false, reason: "status_version_not_advanced" };
  }
  return { ok: true };
}
function signReceiptStatusStatement(input) {
  if (!input.statusSignerPrivateJwk.d) throw new Error("status_signer_private_jwk_required");
  const payloadHash = hashReceiptStatusStatementPayload(input.payload);
  const seed = base64UrlDecode(input.statusSignerPrivateJwk.d);
  const keyPair = nacl__default.default.sign.keyPair.fromSeed(seed);
  const message = Buffer.from(payloadHash, "hex");
  const signature = nacl__default.default.sign.detached(message, keyPair.secretKey);
  return {
    payload: input.payload,
    payload_hash: payloadHash,
    signature: Buffer.from(signature).toString("base64url"),
    status_signer_key_id: input.payload.status_signer_key_id
  };
}
var signReceiptStatusStatementForTests = signReceiptStatusStatement;
function statusPayloadMatchesReceiptContext(input) {
  const p = input.payload;
  if (p.receipt_id !== input.receiptId) return { ok: false, reason: "status_receipt_mismatch" };
  if (p.status_reference !== input.receiptId) return { ok: false, reason: "status_reference_mismatch" };
  if (p.partner_id !== input.partnerId) return { ok: false, reason: "status_partner_mismatch" };
  if (p.policy_id !== input.policyId) return { ok: false, reason: "status_policy_mismatch" };
  if (p.policy_version !== input.policyVersion) return { ok: false, reason: "status_policy_version_mismatch" };
  if (p.environment !== input.environment) return { ok: false, reason: "status_environment_mismatch" };
  return { ok: true };
}

// src/verifyIndependent.ts
function statusMaxAgeSeconds(bundle) {
  return bundle.status_statement_max_age_seconds ?? bundle.statement_cache_max_age_seconds;
}
function rejectUnsignedStatusEvidence() {
  return { ok: false, reason: "unsigned_status_evidence_rejected" };
}
function verifyAbraxasReceiptIndependently(input) {
  const now = input.now ?? /* @__PURE__ */ new Date();
  const phases = [];
  const failure_codes = [];
  const push = (id, status, detail, code) => {
    phases.push({ id, status, detail });
    if (code && (status === "fail" || status === "blocked")) failure_codes.push(code);
  };
  const bundleOk = validateTrustAnchorBundle(input.pinnedTrustAnchor);
  if (!bundleOk.ok) {
    push("pinned_trust_anchor", "fail", bundleOk.reason, bundleOk.reason);
    return finish(false, false, false, false, "indeterminate", phases, failure_codes);
  }
  push("pinned_trust_anchor", "pass", "Pinned trust anchor bundle validated (out-of-band).");
  if (input.pinnedTrustAnchor.environment !== input.relyingParty.environment) {
    push("environment", "fail", "Trust anchor environment does not match relying party.", "cross_environment");
    return finish(false, false, false, false, "no", phases, failure_codes);
  }
  const anchorMatch = assertStatementMatchesPinnedAnchor({
    bundle: input.pinnedTrustAnchor,
    statementAnchorKeyId: input.signedIssuerAuthority.anchor_key_id
  });
  if (!anchorMatch.ok) {
    push("anchor_binding", "fail", anchorMatch.reason, anchorMatch.reason);
    return finish(false, false, false, false, "no", phases, failure_codes);
  }
  push("anchor_binding", "pass", "Statement anchor matches integrator-pinned anchor (no substitution).");
  if (input.statementObservedAt) {
    const observed = Date.parse(input.statementObservedAt);
    if (Number.isNaN(observed) || now.getTime() - observed > input.pinnedTrustAnchor.statement_cache_max_age_seconds * 1e3) {
      push("statement_freshness", "fail", "Signed issuer authority statement is stale.", "statement_stale");
    } else {
      push("statement_freshness", "pass", "Statement within cache max-age policy.");
    }
  } else {
    push("statement_freshness", "blocked", "Statement observation time not provided \u2014 freshness not established.");
    failure_codes.push("statement_freshness_unknown");
  }
  const runtimeEnv = input.relyingParty.environment;
  const integrity = verifyReceiptPayloadIntegrity(input.record);
  push(
    "payload_integrity",
    integrity ? "pass" : "fail",
    integrity ? "Payload hash matches canonical body." : "Payload tampered.",
    integrity ? void 0 : "payload_tampered"
  );
  const sigKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.pinnedTrustAnchor.public_jwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "signature_verification",
    now,
    minimumRegistryVersion: input.minimumRegistryVersion
  });
  let cryptographicallyAuthentic = false;
  if (!sigKey.ok) {
    push("issuer_key_signature", "fail", sigKey.reason, sigKey.reason);
  } else {
    const sigOk = verifyReceiptSignatureWithPublicJwk(input.record, sigKey.key.public_jwk);
    cryptographicallyAuthentic = integrity && sigOk;
    push(
      "receipt_signature",
      sigOk ? "pass" : "fail",
      sigOk ? "Ed25519 receipt signature verified." : "Receipt signature invalid.",
      sigOk ? void 0 : "signature_invalid"
    );
  }
  const authKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.pinnedTrustAnchor.public_jwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "current_authorization",
    now,
    minimumRegistryVersion: input.minimumRegistryVersion
  });
  const issuerAuthorized = authKey.ok;
  push(
    "issuer_current_authorization",
    issuerAuthorized ? "pass" : "fail",
    issuerAuthorized ? "Signing key currently authorized." : `Not authorized: ${authKey.ok ? "" : authKey.reason}`,
    issuerAuthorized ? void 0 : authKey.ok ? void 0 : authKey.reason
  );
  const audienceMatch = input.record.partner_id === input.relyingParty.partner_id && input.record.policy_id === input.relyingParty.policy_id && (runtimeEnv === "production" ? input.record.decision_context === "production" : input.record.decision_context === "sandbox_only");
  push(
    "policy_audience",
    audienceMatch ? "pass" : "fail",
    audienceMatch ? "Partner and policy binding match." : "Partner, policy, or environment mismatch.",
    audienceMatch ? void 0 : "audience_mismatch"
  );
  let statusEvidenceAuthentic = false;
  let currentlyAcceptable = "indeterminate";
  if (input.statusEvidence && !input.signedStatusStatement) {
    const unsigned = rejectUnsignedStatusEvidence();
    push("signed_status_evidence", "fail", unsigned.reason, unsigned.reason);
    failure_codes.push(unsigned.reason);
    currentlyAcceptable = "no";
  } else if (!input.signedStatusStatement) {
    push(
      "signed_status_evidence",
      "blocked",
      "No signed status statement \u2014 current acceptability indeterminate."
    );
    failure_codes.push("signed_status_evidence_required");
  } else {
    const signed = input.signedStatusStatement;
    const auth = verifySignedReceiptStatusStatement({
      signedStatus: signed,
      signedIssuerAuthority: input.signedIssuerAuthority,
      minimumStatusVersion: input.minimumStatusVersion,
      now
    });
    if (!auth.ok) {
      push("signed_status_evidence", "fail", auth.reason, auth.reason);
      currentlyAcceptable = "no";
    } else {
      const ctx = statusPayloadMatchesReceiptContext({
        payload: signed.payload,
        receiptId: input.record.id,
        partnerId: input.relyingParty.partner_id,
        policyId: input.relyingParty.policy_id,
        policyVersion: input.record.policy_version,
        environment: runtimeEnv
      });
      if (!ctx.ok) {
        push("status_context_binding", "fail", ctx.reason, ctx.reason);
        currentlyAcceptable = "no";
      } else {
        const issuedAt = Date.parse(signed.payload.issued_at);
        const maxAge = statusMaxAgeSeconds(input.pinnedTrustAnchor) * 1e3;
        if (Number.isNaN(issuedAt) || now.getTime() - issuedAt > maxAge) {
          push("status_freshness", "fail", "Signed status statement exceeds freshness policy.", "status_statement_stale");
          currentlyAcceptable = "no";
        } else {
          statusEvidenceAuthentic = true;
          push("signed_status_evidence", "pass", "Signed status statement authentic and fresh.");
          const p = signed.payload;
          const liveOk = cryptographicallyAuthentic && issuerAuthorized && audienceMatch && p.receipt_status === "active" && !p.superseded && p.partner_operational && p.policy_active && p.claims_current && p.evidence_current && input.record.decision_result === "approved";
          currentlyAcceptable = liveOk ? "yes" : "no";
          push(
            "current_acceptability",
            liveOk ? "pass" : "fail",
            liveOk ? "Receipt currently acceptable under signed status evidence." : "Receipt not currently acceptable (revocation, supersession, policy, or evidence).",
            liveOk ? void 0 : "not_currently_acceptable"
          );
        }
      }
    }
  }
  return finish(
    cryptographicallyAuthentic,
    issuerAuthorized,
    audienceMatch,
    statusEvidenceAuthentic,
    currentlyAcceptable,
    phases,
    failure_codes
  );
}
function finish(cryptographicallyAuthentic, issuerAuthorized, audienceMatch, statusEvidenceAuthentic, currentlyAcceptable, phases, failure_codes) {
  return {
    contract_version: "abraxas_independent_verifier/1.1.0",
    cryptographically_authentic: cryptographicallyAuthentic,
    issuer_currently_authorized: issuerAuthorized,
    policy_and_audience_match: audienceMatch,
    status_evidence_authentic: statusEvidenceAuthentic,
    currently_acceptable: currentlyAcceptable,
    phases,
    failure_codes: Array.from(new Set(failure_codes)),
    disclaimer: "Pin the trust anchor out-of-band. Issuer authority and current status require signed statements from keys authorized in the issuer authority statement \u2014 not unauthenticated HTTP or JSON."
  };
}

exports.ISSUER_AUTHORITY_STATEMENT_DOCUMENT = ISSUER_AUTHORITY_STATEMENT_DOCUMENT;
exports.ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION = ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION;
exports.RECEIPT_STATUS_EVIDENCE_DOCUMENT = RECEIPT_STATUS_EVIDENCE_DOCUMENT;
exports.RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION = RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION;
exports.RECEIPT_STATUS_STATEMENT_DOCUMENT = RECEIPT_STATUS_STATEMENT_DOCUMENT;
exports.RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION = RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION;
exports.TRUST_ANCHOR_BUNDLE_DOCUMENT = TRUST_ANCHOR_BUNDLE_DOCUMENT;
exports.TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION = TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION;
exports.assertStatementMatchesPinnedAnchor = assertStatementMatchesPinnedAnchor;
exports.buildCanonicalPayloadFromRecord = buildCanonicalPayloadFromRecord;
exports.canonicalizeJson = canonicalizeJson;
exports.hashCanonicalPayload = hashCanonicalPayload;
exports.hashIssuerAuthorityPayload = hashIssuerAuthorityPayload;
exports.hashReceiptStatusStatementPayload = hashReceiptStatusStatementPayload;
exports.normalizeDecisionReceiptTimestamp = normalizeDecisionReceiptTimestamp;
exports.publicEd25519JwkFingerprint = publicEd25519JwkFingerprint;
exports.resolveIssuerKeyFromSignedStatement = resolveIssuerKeyFromSignedStatement;
exports.signIssuerAuthorityPayloadForTests = signIssuerAuthorityPayloadForTests;
exports.signReceiptStatusStatement = signReceiptStatusStatement;
exports.signReceiptStatusStatementForTests = signReceiptStatusStatementForTests;
exports.statusPayloadMatchesReceiptContext = statusPayloadMatchesReceiptContext;
exports.validateTrustAnchorBundle = validateTrustAnchorBundle;
exports.verifyAbraxasReceiptIndependently = verifyAbraxasReceiptIndependently;
exports.verifyEd25519Detached = verifyEd25519Detached;
exports.verifyReceiptPayloadIntegrity = verifyReceiptPayloadIntegrity;
exports.verifyReceiptSignatureWithPublicJwk = verifyReceiptSignatureWithPublicJwk;
exports.verifySignedIssuerAuthorityStatement = verifySignedIssuerAuthorityStatement;
exports.verifySignedReceiptStatusStatement = verifySignedReceiptStatusStatement;
