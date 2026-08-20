// FILE: lib/decisionReceipts/signingKeyDiagnostics.ts
// Boolean-only runtime checks for receipt signing key alignment — no secret material.

import nacl from "tweetnacl";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";

const FIXED_RECEIPT_DIAGNOSTIC_PAYLOAD = buildCanonicalPayload({
  receipt_id: "dr_demo_signing_health_check",
  decision_id: "00000000-0000-4000-8000-000000000001",
  policy_id: "partner-sandbox-gate-v1",
  policy_version: 1,
  partner_id: "abraxas-partner-sandbox",
  subject_pseudonym_id: "ps_demo_signing_health_check",
  wallet_binding_ref: null,
  consent_receipt_id: null,
  decision_result: "approved",
  reason_codes: [],
  evaluated_claim_refs: [],
  issuer_refs: [],
  decision_context: "sandbox_only",
  evaluated_at: "2026-08-13T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
});

export interface ReceiptSigningHealthReport {
  ok: boolean;
  signing_key_configured: boolean;
  signing_key_parse_ok: boolean;
  public_key_configured: boolean;
  public_key_parse_ok: boolean;
  seed_matches_embedded_x: boolean;
  seed_matches_public_env: boolean;
  receipt_env_roundtrip_ok: boolean;
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function parseEd25519PrivateJwk(raw: string | undefined): JsonWebKey | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const jwk = JSON.parse(trimmed) as JsonWebKey;
    if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.d !== "string" || !jwk.d) {
      return null;
    }
    if (typeof jwk.x !== "string" || !jwk.x) return null;
    const seed = base64UrlDecode(jwk.d);
    if (seed.length !== 32) return null;
    return jwk;
  } catch {
    return null;
  }
}

function parseEd25519PublicJwk(raw: string | undefined): JsonWebKey | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const jwk = JSON.parse(trimmed) as JsonWebKey;
    if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || !jwk.x) {
      return null;
    }
    const pub = base64UrlDecode(jwk.x);
    if (pub.length !== 32) return null;
    return jwk;
  } catch {
    return null;
  }
}

export function derivePublicXFromPrivateSeed(privateJwk: JsonWebKey): string | null {
  if (!privateJwk.d || typeof privateJwk.x !== "string") return null;
  try {
    const seed = base64UrlDecode(privateJwk.d);
    if (seed.length !== 32) return null;
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    return base64UrlEncode(keyPair.publicKey);
  } catch {
    return null;
  }
}

function receiptEnvRoundtripOk(privateJwk: JsonWebKey, publicJwk: JsonWebKey): boolean {
  try {
    const { signature } = signReceiptPayload(FIXED_RECEIPT_DIAGNOSTIC_PAYLOAD, privateJwk);
    return verifyReceiptSignature(FIXED_RECEIPT_DIAGNOSTIC_PAYLOAD, signature, publicJwk);
  } catch {
    return false;
  }
}

export function evaluateReceiptSigningHealth(
  env: Record<string, string | undefined> = process.env,
): ReceiptSigningHealthReport {
  const signingRaw = env.ABRAXAS_SIGNING_KEY;
  const publicRaw = env.ABRAXAS_PUBLIC_KEY;

  const signing_key_configured = Boolean(signingRaw?.trim());
  const public_key_configured = Boolean(publicRaw?.trim());

  const privateJwk = parseEd25519PrivateJwk(signingRaw);
  const publicJwk = parseEd25519PublicJwk(publicRaw);

  const signing_key_parse_ok = privateJwk !== null;
  const public_key_parse_ok = publicJwk !== null;

  let seed_matches_embedded_x = false;
  let seed_matches_public_env = false;
  let receipt_env_roundtrip_ok = false;

  if (privateJwk) {
    const derivedX = derivePublicXFromPrivateSeed(privateJwk);
    seed_matches_embedded_x = derivedX !== null && timingSafeEqualString(derivedX, privateJwk.x!);
    if (publicJwk && derivedX) {
      seed_matches_public_env = timingSafeEqualString(derivedX, publicJwk.x!);
    }
  }

  if (privateJwk && publicJwk && seed_matches_public_env) {
    receipt_env_roundtrip_ok = receiptEnvRoundtripOk(privateJwk, publicJwk);
  }

  const ok =
    signing_key_parse_ok
    && public_key_parse_ok
    && seed_matches_embedded_x
    && seed_matches_public_env
    && receipt_env_roundtrip_ok;

  return {
    ok,
    signing_key_configured,
    signing_key_parse_ok,
    public_key_configured,
    public_key_parse_ok,
    seed_matches_embedded_x,
    seed_matches_public_env,
    receipt_env_roundtrip_ok,
  };
}

const ALLOWED_SIGNING_HEALTH_KEYS = new Set([
  "ok",
  "signing_key_configured",
  "signing_key_parse_ok",
  "public_key_configured",
  "public_key_parse_ok",
  "seed_matches_embedded_x",
  "seed_matches_public_env",
  "receipt_env_roundtrip_ok",
]);

export function signingHealthResponseHasNoSecrets(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== ALLOWED_SIGNING_HEALTH_KEYS.size) return false;
  for (const key of keys) {
    if (!ALLOWED_SIGNING_HEALTH_KEYS.has(key)) return false;
    if (typeof record[key] !== "boolean") return false;
  }
  return true;
}
