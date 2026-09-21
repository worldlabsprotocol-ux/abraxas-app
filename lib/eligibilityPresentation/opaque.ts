// FILE: lib/eligibilityPresentation/opaque.ts

import { createHash, randomBytes } from "node:crypto";

export function opaquePresentationRef(seed: string): string {
  return `ep_${createHash("sha256").update(`eligibility-presentation:${seed}`).digest("hex").slice(0, 20)}`;
}

export function opaqueRequestRef(seed: string): string {
  return `epr_${createHash("sha256").update(`eligibility-presentation-request:${seed}`).digest("hex").slice(0, 20)}`;
}

export function audienceHash(partnerId: string): string {
  return createHash("sha256").update(`eligibility-audience:${partnerId}`).digest("hex");
}

export function partnerHmac(partnerId: string): string {
  return createHash("sha256").update(`eligibility-partner:${partnerId}`).digest("hex");
}

export function nonceHash(nonce: string): string {
  return createHash("sha256").update(`eligibility-nonce:${nonce}`).digest("hex");
}

export function newVerifierNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function purposeClass(purpose: string): string {
  return purpose.trim().slice(0, 120);
}
