// FILE: lib/partner/portableIndependentVerification/assessReadiness.ts
// Issuer-side readiness for exporting SIAS + signed status (not a protocol requirement for verify).

import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";

export type PortableVerificationGap =
  | "receipt_registry_unavailable"
  | "trust_anchor_public_jwk_missing"
  | "trust_anchor_private_jwk_missing"
  | "status_signer_private_jwk_missing"
  | "status_signer_public_jwk_missing"
  | "status_signer_key_id_missing";

export function assessPortableVerificationReadiness(
  env: Record<string, string | undefined> = process.env,
): { ready: true } | { ready: false; gaps: PortableVerificationGap[] } {
  const gaps: PortableVerificationGap[] = [];
  const registry = loadReceiptVerificationRegistry(env);
  if (!registry.ok) gaps.push("receipt_registry_unavailable");

  if (!env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK?.trim()) {
    gaps.push("trust_anchor_public_jwk_missing");
  }
  if (!env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK?.trim()) {
    gaps.push("trust_anchor_private_jwk_missing");
  }
  if (!env.ABRAXAS_STATUS_SIGNER_KEY_ID?.trim()) gaps.push("status_signer_key_id_missing");
  if (!env.ABRAXAS_STATUS_SIGNER_PUBLIC_JWK?.trim()) gaps.push("status_signer_public_jwk_missing");
  if (!env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK?.trim()) gaps.push("status_signer_private_jwk_missing");

  return gaps.length === 0 ? { ready: true } : { ready: false, gaps };
}
