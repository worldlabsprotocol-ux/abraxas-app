// FILE: lib/reclaimAttestation/opaque.ts

import { createHash, createHmac, randomBytes } from "node:crypto";
import { reclaimHmacSecret } from "./config";

export function opaqueSessionRef(): string {
  return `rpa_${randomBytes(12).toString("hex")}`;
}

export function opaqueSessionNonce(): string {
  return randomBytes(32).toString("hex");
}

export function opaqueCallbackRef(): string {
  return `rcb_${createHash("sha256").update(reclaimCallbackPathSeed()).digest("hex").slice(0, 16)}`;
}

function reclaimCallbackPathSeed(): string {
  return "abraxas-reclaim-callback";
}

export function hmacValue(label: string, value: string): string {
  const secret = reclaimHmacSecret();
  if (!secret) {
    throw Object.assign(new Error("reclaim_hmac_unavailable"), { code: "reclaim_hmac_unavailable" });
  }
  return createHmac("sha256", secret).update(`${label}:${value}`).digest("hex");
}

export function nonceHash(nonce: string): string {
  return hmacValue("reclaim-nonce", nonce);
}

export function holderBindingHmac(holderSubject: string): string {
  return hmacValue("reclaim-holder", holderSubject);
}

export function policyBindingHmac(policyId: string, policyVersion: number): string {
  return hmacValue("reclaim-policy", `${policyId}:${policyVersion}`);
}

export function verifyRequestHmac(verifyRequest: string): string {
  return hmacValue("reclaim-verify-request", verifyRequest);
}

export function contextAddressFromNonce(nonce: string): string {
  return `0x${nonce.slice(0, 40)}`;
}

export function contextBindingHmac(contextAddress: string): string {
  return hmacValue("reclaim-context", contextAddress.toLowerCase());
}

export function proofDigest(proofs: unknown): string {
  return createHash("sha256").update(stableStringify(proofs)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(",")}}`;
}
