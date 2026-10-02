// FILE: lib/identity/pairwiseSubject/derive.ts
// Pairwise relying-party subject references — HMAC-SHA-256, versioned.

import { createHmac } from "crypto";

export const PAIRWISE_SUBJECT_VERSION = "pairwise_v1" as const;

export type PairwiseBoundary = {
  partnerId: string;
  applicationId?: string | null;
};

function resolvePairwiseKey(): string | null {
  const key = process.env.PAIRWISE_SUBJECT_HMAC_KEY?.trim();
  if (key) return key;
  if (process.env.NODE_ENV === "test" || process.env.VERCEL_ENV === "preview") {
    return process.env.PAIRWISE_SUBJECT_HMAC_KEY_TEST ?? "pairwise-test-key-do-not-use-in-production";
  }
  return null;
}

export function pairwiseSubjectRef(input: {
  abraxasSubjectId: string;
  boundary: PairwiseBoundary;
  version?: typeof PAIRWISE_SUBJECT_VERSION;
}): { ok: true; ref: string } | { ok: false; code: "pairwise_key_missing" } {
  const key = resolvePairwiseKey();
  if (!key) {
    return { ok: false, code: "pairwise_key_missing" };
  }

  const version = input.version ?? PAIRWISE_SUBJECT_VERSION;
  const app = input.boundary.applicationId?.trim() || "_";
  const message = `${version}:${input.boundary.partnerId}:${app}:${input.abraxasSubjectId}`;
  const ref = createHmac("sha256", key).update(message, "utf8").digest("hex").slice(0, 32);
  return { ok: true, ref: `psr_${ref}` };
}

/** Per-application boundary prevents unintended cross-tenant correlation within a partner org. */
export function defaultPairwiseBoundary(partnerId: string, applicationId?: string | null): PairwiseBoundary {
  return { partnerId, applicationId: applicationId ?? null };
}
