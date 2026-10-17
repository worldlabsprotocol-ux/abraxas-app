// Vitest stub — @ledgerhq/errors ESM helper resolution for wallet-adapter imports.

export class TransportStatusError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "TransportStatusError";
  }
}

export function statusCodeToString(_code: number): string {
  return "Transport error";
}
