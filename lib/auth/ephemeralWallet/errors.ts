// FILE: lib/auth/ephemeralWallet/errors.ts

export class EphemeralStateUnavailableError extends Error {
  readonly code = "ephemeral_state_unavailable";

  constructor() {
    super("Ephemeral security state store is unavailable");
    this.name = "EphemeralStateUnavailableError";
  }
}
