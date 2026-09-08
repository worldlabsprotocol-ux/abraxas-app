// FILE: lib/assurance/selfAttestation/browseReceipt.ts
// L0 browse-access receipt — not valid for purchase.

import { SignJWT, jwtVerify, importJWK } from "jose";
import type { SelfAttestedAgeBand } from "./constants";
import { BROWSE_RECEIPT_ARTIFACT_TYPE, SELF_ATTESTATION_ASSURANCE } from "./constants";

export interface BrowseAccessReceiptPayload {
  artifact_type: typeof BROWSE_RECEIPT_ARTIFACT_TYPE;
  receipt_id: string;
  purpose: "browse";
  assurance_level: typeof SELF_ATTESTATION_ASSURANCE;
  valid_for_purchase: false;
  partner_id: string;
  policy_id: string;
  age_band: SelfAttestedAgeBand;
  issued_at: string;
  expires_at: string;
  nonce: string;
}

const FORBIDDEN_RECEIPT_KEYS = [
  "date_of_birth",
  "dob",
  "document_number",
  "passport_image",
  "selfie",
  "legal_name",
  "address",
  "oauth_sub",
];

export function assertBrowseReceiptHasNoPii(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_RECEIPT_KEYS.includes(key.toLowerCase())) {
      throw new Error(`browse_receipt_contains_forbidden_field:${key}`);
    }
  }
}

export async function signBrowseAccessReceipt(
  payload: BrowseAccessReceiptPayload,
): Promise<string | null> {
  assertBrowseReceiptHasNoPii(payload as unknown as Record<string, unknown>);
  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) return null;
  const key = await importJWK(JSON.parse(signingKeyJson), "EdDSA");
  const exp = Math.floor(new Date(payload.expires_at).getTime() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setJti(payload.nonce)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
}

function resolveVerifyKeyJwk(): JsonWebKey | null {
  const publicJson = process.env.ABRAXAS_PUBLIC_KEY?.trim();
  if (publicJson) {
    try {
      return JSON.parse(publicJson) as JsonWebKey;
    } catch {
      return null;
    }
  }
  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!signingKeyJson) return null;
  try {
    const jwk = JSON.parse(signingKeyJson) as JsonWebKey & { d?: string };
    if (!jwk.d) return jwk;
    const { d: _discard, ...publicJwk } = jwk;
    return publicJwk;
  } catch {
    return null;
  }
}

export async function verifyBrowseAccessReceipt(
  token: string,
): Promise<{ ok: true; payload: BrowseAccessReceiptPayload } | { ok: false; code: string }> {
  const verifyJwk = resolveVerifyKeyJwk();
  if (!verifyJwk) return { ok: false, code: "signing_not_configured" };
  try {
    const key = await importJWK(verifyJwk, "EdDSA");
    const { payload } = await jwtVerify(token, key);
    const record = payload as unknown as BrowseAccessReceiptPayload;
    if (record.artifact_type !== BROWSE_RECEIPT_ARTIFACT_TYPE) {
      return { ok: false, code: "artifact_type_mismatch" };
    }
    if (record.valid_for_purchase !== false) {
      return { ok: false, code: "not_browse_receipt" };
    }
    if (record.purpose !== "browse") {
      return { ok: false, code: "purpose_mismatch" };
    }
    assertBrowseReceiptHasNoPii(record as unknown as Record<string, unknown>);
    return { ok: true, payload: record };
  } catch {
    return { ok: false, code: "signature_invalid" };
  }
}

export function buildBrowseReceiptPayload(input: {
  receiptId: string;
  partnerId: string;
  policyId: string;
  ageBand: SelfAttestedAgeBand;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
}): BrowseAccessReceiptPayload {
  return {
    artifact_type: BROWSE_RECEIPT_ARTIFACT_TYPE,
    receipt_id: input.receiptId,
    purpose: "browse",
    assurance_level: SELF_ATTESTATION_ASSURANCE,
    valid_for_purchase: false,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    age_band: input.ageBand,
    issued_at: input.issuedAt,
    expires_at: input.expiresAt,
    nonce: input.nonce,
  };
}
