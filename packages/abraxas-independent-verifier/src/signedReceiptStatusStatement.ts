import nacl from "tweetnacl";
import type {
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
  StatusSignerKeyEntry,
  ReceiptStatusStatementPayload,
} from "./types";
import { canonicalizeJson } from "./canonical";
import { createHash } from "node:crypto";
import { base64UrlDecode, verifyEd25519Detached } from "./crypto";

export function hashReceiptStatusStatementPayload(payload: ReceiptStatusStatementPayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function resolveStatusSigner(
  statement: SignedIssuerAuthorityStatement,
  keyId: string,
  environment: "demo" | "production",
  now: Date,
): { ok: true; key: StatusSignerKeyEntry } | { ok: false; reason: string } {
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

export function verifySignedReceiptStatusStatement(input: {
  signedStatus: SignedReceiptStatusStatement;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  minimumStatusVersion?: number;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  const now = input.now ?? new Date();
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
    now,
  );
  if (!signer.ok) return signer;

  const message = Buffer.from(signedStatus.payload_hash, "hex");
  if (
    !verifyEd25519Detached({
      message,
      signatureBase64Url: signedStatus.signature,
      publicJwk: signer.key.public_jwk,
    })
  ) {
    return { ok: false, reason: "status_statement_signature_invalid" };
  }

  const issuedAt = Date.parse(signedStatus.payload.issued_at);
  if (!Number.isNaN(issuedAt) && issuedAt > Date.now() + 60_000) {
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
  if (
    signedStatus.payload.supersedes_status_version != null
    && signedStatus.payload.status_version <= signedStatus.payload.supersedes_status_version
  ) {
    return { ok: false, reason: "status_version_not_advanced" };
  }

  return { ok: true };
}

export function signReceiptStatusStatement(input: {
  payload: ReceiptStatusStatementPayload;
  statusSignerPrivateJwk: JsonWebKey;
}): SignedReceiptStatusStatement {
  if (!input.statusSignerPrivateJwk.d) throw new Error("status_signer_private_jwk_required");
  const payloadHash = hashReceiptStatusStatementPayload(input.payload);
  const seed = base64UrlDecode(input.statusSignerPrivateJwk.d);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const message = Buffer.from(payloadHash, "hex");
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  return {
    payload: input.payload,
    payload_hash: payloadHash,
    signature: Buffer.from(signature).toString("base64url"),
    status_signer_key_id: input.payload.status_signer_key_id,
  };
}

/** @deprecated Use signReceiptStatusStatement */
export const signReceiptStatusStatementForTests = signReceiptStatusStatement;

export function statusPayloadMatchesReceiptContext(input: {
  payload: ReceiptStatusStatementPayload;
  receiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  environment: "demo" | "production";
}): { ok: true } | { ok: false; reason: string } {
  const p = input.payload;
  if (p.receipt_id !== input.receiptId) return { ok: false, reason: "status_receipt_mismatch" };
  if (p.status_reference !== input.receiptId) return { ok: false, reason: "status_reference_mismatch" };
  if (p.partner_id !== input.partnerId) return { ok: false, reason: "status_partner_mismatch" };
  if (p.policy_id !== input.policyId) return { ok: false, reason: "status_policy_mismatch" };
  if (p.policy_version !== input.policyVersion) return { ok: false, reason: "status_policy_version_mismatch" };
  if (p.environment !== input.environment) return { ok: false, reason: "status_environment_mismatch" };
  return { ok: true };
}
