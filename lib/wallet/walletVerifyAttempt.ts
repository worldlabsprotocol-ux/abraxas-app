// FILE: lib/wallet/walletVerifyAttempt.ts
// Generation-guarded wallet auth attempts — stale responses must not commit.

export type WalletVerifyAttempt = {
  readonly generation: number;
  readonly abort: AbortController;
  /** Challenge issued for this attempt only; verify must match. */
  challengeId: string | null;
  isStale: () => boolean;
  invalidate: () => void;
  bindChallenge: (challengeId: string) => void;
  canCommitChallenge: (challengeId: string) => boolean;
};

let globalGeneration = 0;

export function createWalletVerifyAttempt(): WalletVerifyAttempt {
  globalGeneration += 1;
  const generation = globalGeneration;
  const abort = new AbortController();
  let invalidated = false;
  let challengeId: string | null = null;

  return {
    generation,
    abort,
    get challengeId() {
      return challengeId;
    },
    isStale: () => invalidated || generation !== globalGeneration,
    invalidate: () => {
      invalidated = true;
      challengeId = null;
      abort.abort();
    },
    bindChallenge: (id: string) => {
      if (invalidated || generation !== globalGeneration) return;
      challengeId = id;
    },
    canCommitChallenge: (id: string) => {
      if (invalidated || generation !== globalGeneration) return false;
      if (!challengeId) return false;
      return challengeId === id;
    },
  };
}

export function invalidateAllWalletVerifyAttempts(): void {
  globalGeneration += 1;
}
