// FILE: lib/wallet/walletVerifyAttempt.ts
// Generation-guarded wallet auth attempts — stale responses must not commit.

export type WalletVerifyAttempt = {
  readonly generation: number;
  readonly abort: AbortController;
  isStale: () => boolean;
  invalidate: () => void;
};

let globalGeneration = 0;

export function createWalletVerifyAttempt(): WalletVerifyAttempt {
  globalGeneration += 1;
  const generation = globalGeneration;
  const abort = new AbortController();
  let invalidated = false;

  return {
    generation,
    abort,
    isStale: () => invalidated || generation !== globalGeneration,
    invalidate: () => {
      invalidated = true;
      abort.abort();
    },
  };
}

export function invalidateAllWalletVerifyAttempts(): void {
  globalGeneration += 1;
}
