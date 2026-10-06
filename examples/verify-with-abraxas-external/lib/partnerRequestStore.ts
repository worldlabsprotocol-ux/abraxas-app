// FILE: examples/verify-with-abraxas-external/lib/partnerRequestStore.ts
// Partner-owned durable request correlation — implement with Postgres/Redis/KV in production.

import type { PartnerRequestStateStore, PartnerVerificationRequestState } from "@abraxas/partner-kit";

/** Production implementations replace this with Postgres, Redis, Vercel KV, etc. */
export interface ExternalPartnerRequestStore extends PartnerRequestStateStore {}

/**
 * TEST/LOCAL ONLY — shared injectable store simulating a durable database.
 * Pass the same instance across serverless invocations in production (via your DB client).
 */
export function createExternalPartnerRequestStore(): ExternalPartnerRequestStore {
  const backing = new Map<string, PartnerVerificationRequestState>();
  return {
    put(state) {
      backing.set(state.requestId, state);
    },
    get(requestId) {
      const state = backing.get(requestId.trim());
      if (!state) return null;
      if (new Date(state.expiresAt).getTime() <= Date.now()) {
        backing.delete(requestId);
        return null;
      }
      return state;
    },
    consume(requestId) {
      const state = backing.get(requestId.trim()) ?? null;
      if (state) backing.delete(requestId);
      return state;
    },
  };
}
