// FILE: examples/verify-with-abraxas-external/lib/idempotency.ts
// Partner-owned transaction guard — Abraxas verifies proof; partner owns business state.

const completedActions = new Set<string>();

export function resetExternalActionStoreForTests(): void {
  completedActions.clear();
}

export function tryCompleteProtectedAction(actionKey: string): { ok: true } | { ok: false; reason: "duplicate" } {
  if (completedActions.has(actionKey)) {
    return { ok: false, reason: "duplicate" };
  }
  completedActions.add(actionKey);
  return { ok: true };
}
