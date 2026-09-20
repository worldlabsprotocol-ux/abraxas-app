// FILE: lib/decisionReceipts/verificationKeyLifecycle/resolve.ts
// Issuance and verification resolve key IDs only through the server registry.

import type { DecisionReceiptCanonicalPayload, DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  getReceiptSigningKeyId,
  loadReceiptSigningKey,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import type { ReceiptKeyEnvironment, ReceiptVerificationKeyRecord } from "./contract";
import { resolveReceiptKeyRuntimeEnvironment } from "./environment";
import { publicReceiptJwkFingerprint, toPublicReceiptJwk } from "./fingerprint";
import { loadReceiptVerificationRegistry } from "./registry";

export type ReceiptKeyResolveReason =
  | "ok"
  | "unknown_key"
  | "wrong_environment"
  | "not_yet_valid"
  | "expired"
  | "revoked"
  | "schema_mismatch"
  | "unavailable"
  | "inconsistent"
  | "historical_not_allowed";

function inWindow(key: ReceiptVerificationKeyRecord, now: Date, mode: "issue" | "verify"): ReceiptKeyResolveReason {
  const nowMs = now.getTime();
  const notBefore = Date.parse(key.not_before);
  if (Number.isNaN(notBefore) || nowMs < notBefore) return "not_yet_valid";
  if (key.status === "revoked") return "revoked";
  if (mode === "issue") {
    if (key.status !== "active") return "expired";
    if (key.expires_at) {
      const expires = Date.parse(key.expires_at);
      if (Number.isNaN(expires) || nowMs >= expires) return "expired";
    }
    return "ok";
  }
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

export function resolveVerificationKey(input: {
  keyId: string;
  schemaVersion: string;
  now?: Date;
  env?: Record<string, string | undefined>;
  runtimeEnvironment?: ReceiptKeyEnvironment;
}): { ok: true; key: ReceiptVerificationKeyRecord } | { ok: false; reason: ReceiptKeyResolveReason } {
  const env = input.env ?? process.env;
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const runtime = input.runtimeEnvironment ?? loaded.environment;
  const key = loaded.keys.find((item) => item.key_id === input.keyId);
  if (!key) return { ok: false, reason: "unknown_key" };
  if (key.environment !== runtime) return { ok: false, reason: "wrong_environment" };
  if (!key.schema_versions.includes(input.schemaVersion)) return { ok: false, reason: "schema_mismatch" };
  const windowReason = inWindow(key, input.now ?? new Date(), "verify");
  if (windowReason !== "ok") return { ok: false, reason: windowReason };
  return { ok: true, key };
}

export function resolveIssuanceSigningKey(input: {
  schemaVersion: string;
  now?: Date;
  env?: Record<string, string | undefined>;
}):
  | { ok: true; key_id: string; privateKeyJwk: JsonWebKey }
  | { ok: false; reason: ReceiptKeyResolveReason } {
  const env = input.env ?? process.env;
  const signing = loadReceiptSigningKey();
  if (!signing) return { ok: false, reason: "unavailable" };
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const keyId = signing.signingKeyId || getReceiptSigningKeyId();
  const key = loaded.keys.find((item) => item.key_id === keyId);
  if (!key) return { ok: false, reason: "unknown_key" };
  if (key.environment !== loaded.environment) return { ok: false, reason: "wrong_environment" };
  if (key.status !== "active") return { ok: false, reason: "expired" };
  if (!key.schema_versions.includes(input.schemaVersion)) return { ok: false, reason: "schema_mismatch" };
  const windowReason = inWindow(key, input.now ?? new Date(), "issue");
  if (windowReason !== "ok") return { ok: false, reason: windowReason };
  const publicFromPrivate = toPublicReceiptJwk(signing.publicKeyJwk);
  if (!publicFromPrivate || publicReceiptJwkFingerprint(publicFromPrivate) !== key.fingerprint) {
    return { ok: false, reason: "inconsistent" };
  }
  return { ok: true, key_id: key.key_id, privateKeyJwk: signing.privateKeyJwk };
}

export function verifyRecordSignatureWithRegistry(
  record: DecisionReceiptRecord,
  now?: Date,
  env?: Record<string, string | undefined>,
): boolean {
  const resolved = resolveVerificationKey({
    keyId: record.signing_key_id,
    schemaVersion: record.schema_version,
    now,
    env,
  });
  if (!resolved.ok) return false;
  const payload: DecisionReceiptCanonicalPayload = buildCanonicalPayload({
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
    expires_at: record.expires_at,
  });
  return verifyReceiptSignature(payload, record.signature, resolved.key.public_jwk);
}
