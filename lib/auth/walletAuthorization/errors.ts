// FILE: lib/auth/walletAuthorization/errors.ts

export class ScopedChallengeStoreUnavailableError extends Error {
  readonly code = "scoped_challenge_store_unavailable" as const;

  constructor(message = "Scoped trust challenge store unavailable") {
    super(message);
    this.name = "ScopedChallengeStoreUnavailableError";
  }
}
