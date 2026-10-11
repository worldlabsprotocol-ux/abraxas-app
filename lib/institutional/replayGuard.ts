// Deprecated in-process guard — production uses durableReplayNonceStore.
// Kept for harness reset hook name compatibility in tests.

export function resetInstitutionalReplayGuardForTests(): void {
  // Durable store resets via fake backend — no in-process state.
}
