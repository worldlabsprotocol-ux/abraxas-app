// FILE: examples/verify-with-abraxas-external/lib/protectedActionStore.ts
// Partner-owned idempotency for protected native actions after verification succeeds.

/** Production implementations use Postgres/Redis with atomic compare-and-set. */
export interface ProtectedActionStore {
  tryComplete(actionKey: string): Promise<{ ok: true } | { ok: false; reason: "duplicate" }>
    | { ok: true } | { ok: false; reason: "duplicate" };
}

/**
 * TEST/LOCAL ONLY — injectable store simulating durable idempotency keys.
 * In production, back this with your transactional datastore.
 */
export function createProtectedActionStore(): ProtectedActionStore {
  const completed = new Set<string>();
  return {
    tryComplete(actionKey: string) {
      if (completed.has(actionKey)) {
        return { ok: false, reason: "duplicate" };
      }
      completed.add(actionKey);
      return { ok: true };
    },
  };
}
