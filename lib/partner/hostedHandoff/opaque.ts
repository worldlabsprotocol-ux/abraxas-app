// FILE: lib/partner/hostedHandoff/opaque.ts

import { createHash, randomBytes } from "node:crypto";

export function opaqueHandoffRef(seed: string): string {
  return `hpf_${createHash("sha256").update(`handoff:${seed}`).digest("hex").slice(0, 16)}`;
}

export function opaqueVerifyRequest(seed: string): string {
  return `vr_${createHash("sha256").update(`verify-request:${seed}`).digest("hex").slice(0, 16)}`;
}

export function opaqueNonce(): string {
  return randomBytes(16).toString("hex");
}

export function nonceHash(nonce: string): string {
  return createHash("sha256").update(`handoff-nonce:${nonce}`).digest("hex");
}
