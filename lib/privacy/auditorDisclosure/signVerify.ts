// FILE: lib/privacy/auditorDisclosure/signVerify.ts

import nacl from "tweetnacl";
import { verifyEd25519Detached } from "@abraxas/independent-verifier";
import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import { resolveIssuerKeyFromSignedStatement } from "@/lib/persistence/boundary/issuerAuthority/resolveIssuerKey";
import type { AuditorDisclosureMandatePayload, SignedAuditorDisclosureMandate } from "./contract";
import {
  AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION,
  INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS,
} from "./contract";
import { hashAuditorDisclosureMandatePayload } from "./canonical";

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function ed25519KeyPairFromJwk(privateJwk: JsonWebKey): nacl.SignKeyPair {
  if (!privateJwk.d) throw new Error("Ed25519 private JWK missing d");
  const seed = base64UrlDecode(privateJwk.d);
  if (seed.length !== 32) throw new Error("Invalid Ed25519 seed length");
  return nacl.sign.keyPair.fromSeed(seed);
}

export function signAuditorDisclosureMandatePayload(input: {
  payload: AuditorDisclosureMandatePayload;
  mandateIssuerPrivateJwk: JsonWebKey;
  signingKeyId: string;
}): SignedAuditorDisclosureMandate {
  const payload_hash = hashAuditorDisclosureMandatePayload(input.payload);
  const message = Buffer.from(payload_hash, "hex");
  const keyPair = ed25519KeyPairFromJwk(input.mandateIssuerPrivateJwk);
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  return {
    payload: input.payload,
    payload_hash,
    signature: base64UrlEncode(signature),
    signing_key_id: input.signingKeyId,
  };
}

export type AuditorMandateVerificationTiming = "issuance" | "verification" | "enforcement";

export type VerifySignedAuditorDisclosureMandateResult =
  | { ok: true; payload: AuditorDisclosureMandatePayload; checks_at: AuditorMandateVerificationTiming[] }
  | { ok: false; reason: string; trust_boundary: string };

export function verifySignedAuditorDisclosureMandate(input: {
  signed: SignedAuditorDisclosureMandate;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  environment: "demo" | "production";
  now: Date;
  minimumRegistryVersion?: number;
}): VerifySignedAuditorDisclosureMandateResult {
  const checks_at: AuditorMandateVerificationTiming[] = ["verification"];

  const expectedHash = hashAuditorDisclosureMandatePayload(input.signed.payload);
  if (expectedHash !== input.signed.payload_hash) {
    return {
      ok: false,
      reason: "auditor_mandate_payload_hash_mismatch",
      trust_boundary: "evidence_integrity",
    };
  }

  if (input.signed.signing_key_id !== input.signed.payload.issuer_key_id) {
    return {
      ok: false,
      reason: "auditor_mandate_signing_key_id_mismatch",
      trust_boundary: "issuer_binding",
    };
  }

  const resolved = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    keyId: input.signed.signing_key_id,
    schemaVersion: AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION,
    environment: input.environment,
    mode: "current_authorization",
    now: input.now,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });
  if (!resolved.ok) {
    return {
      ok: false,
      reason: resolved.reason,
      trust_boundary: "issuer_authority_current_validity",
    };
  }

  if (resolved.key.reason_class !== INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS) {
    return {
      ok: false,
      reason: "issuer_not_authorized_for_auditor_mandate_class",
      trust_boundary: "auditor_mandate_issuer_authority",
    };
  }

  const message = Buffer.from(input.signed.payload_hash, "hex");
  if (
    !verifyEd25519Detached({
      message,
      signatureBase64Url: input.signed.signature,
      publicJwk: resolved.key.public_jwk,
    })
  ) {
    return {
      ok: false,
      reason: "auditor_mandate_signature_invalid",
      trust_boundary: "cryptographic_authenticity",
    };
  }

  const payload = input.signed.payload;
  if (payload.environment !== input.environment) {
    return { ok: false, reason: "auditor_mandate_environment_mismatch", trust_boundary: "tenant_environment" };
  }

  if (payload.revoked_at) {
    return { ok: false, reason: "auditor_mandate_revoked", trust_boundary: "continuity_revocation" };
  }

  if (payload.disclosure_surface !== "auditor_review") {
    return { ok: false, reason: "auditor_mandate_invalid_surface", trust_boundary: "disclosure_surface_binding" };
  }

  const notBefore = Date.parse(payload.not_before);
  const notAfter = Date.parse(payload.not_after);
  const nowMs = input.now.getTime();
  if (Number.isNaN(notBefore) || Number.isNaN(notAfter)) {
    return { ok: false, reason: "auditor_mandate_invalid_dates", trust_boundary: "continuity_validity" };
  }
  if (nowMs < notBefore) {
    return { ok: false, reason: "auditor_mandate_not_yet_valid", trust_boundary: "continuity_effective_window" };
  }
  if (nowMs > notAfter) {
    return { ok: false, reason: "auditor_mandate_expired", trust_boundary: "continuity_expiration" };
  }

  checks_at.push("enforcement");
  return { ok: true, payload, checks_at };
}