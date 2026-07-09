// FILE: lib/trust/issuerClaimAttestation.ts
// Verify signed issuer claim attestations before accepting claims.

import { createHash } from "crypto";
import nacl from "tweetnacl";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import {
  getIssuerById,
  getIssuerSigningKey,
  appendIssuerAuditEvent,
} from "@/lib/trust/issuerFramework";
import { upsertClaims } from "@/lib/credentials/claimsService";
import type { AssuranceLevel, ClaimType } from "@/lib/credentials/claimSchema";

export interface IssuerClaimAttestationPayload {
  schema_version: string;
  issuer_id: string;
  signing_key_id: string;
  subject_id: string;
  claim_type: ClaimType | string;
  assurance_level: AssuranceLevel | null;
  jurisdiction: string | null;
  issued_at: string;
  expires_at: string | null;
  claim_value: Record<string, unknown>;
  idempotency_key: string;
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

export function verifyIssuerAttestationSignature(
  payload: IssuerClaimAttestationPayload,
  signature: string,
  publicKeyJwk: Record<string, unknown>,
): boolean {
  const x = publicKeyJwk.x as string | undefined;
  if (!x) return false;
  const canonical = canonicalizeJson(payload);
  const hash = createHash("sha256").update(canonical, "utf8").digest();
  const message = Buffer.from(hash);
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(signature);
  } catch {
    return false;
  }
  const pubKey = base64UrlDecode(x);
  return nacl.sign.detached.verify(message, sig, pubKey);
}

export async function submitIssuerClaimAttestation(input: {
  payload: IssuerClaimAttestationPayload;
  signature: string;
}): Promise<{ ok: true; claim_types: string[] } | { ok: false; error: string }> {
  const { payload, signature } = input;

  const issuer = await getIssuerById(payload.issuer_id);
  if (!issuer || issuer.issuer_status !== "active") {
    return { ok: false, error: "Issuer not active" };
  }

  const key = await getIssuerSigningKey(payload.signing_key_id);
  if (!key || key.status !== "active" || key.issuer_id !== payload.issuer_id) {
    return { ok: false, error: "Signing key invalid or revoked" };
  }

  if (key.allowed_claim_scopes.length > 0 && !key.allowed_claim_scopes.includes(payload.claim_type)) {
    return { ok: false, error: "Claim type not in key scope" };
  }

  if (!issuer.supported_claims.includes(payload.claim_type)) {
    return { ok: false, error: "Claim type not supported by issuer" };
  }

  if (!verifyIssuerAttestationSignature(payload, signature, key.public_key_jwk)) {
    return { ok: false, error: "Invalid attestation signature" };
  }

  if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
    return { ok: false, error: "Attestation already expired" };
  }

  await upsertClaims([{
    subject_id: payload.subject_id,
    credential_jti: null,
    claim_type: payload.claim_type as ClaimType,
    claim_value: payload.claim_value,
    issuer_id: payload.issuer_id,
    assurance_level: payload.assurance_level,
    issued_at: payload.issued_at,
    expires_at: payload.expires_at,
    revocation_reference: null,
    evidence_reference: payload.idempotency_key,
    jurisdiction: payload.jurisdiction,
    policy_scope: null,
  }]);

  await appendIssuerAuditEvent({
    issuerId: payload.issuer_id,
    action: "claim.attestation_accepted",
    actorType: "issuer",
    actorId: payload.signing_key_id,
    metadata: {
      claim_type: payload.claim_type,
      subject_id: payload.subject_id,
      idempotency_key: payload.idempotency_key,
    },
    idempotencyKey: `claim:${payload.idempotency_key}`,
  });

  return { ok: true, claim_types: [payload.claim_type] };
}
