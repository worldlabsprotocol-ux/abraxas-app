// FILE: lib/auth/ephemeralWallet/sandboxValidateClientRequest.ts
// Canonical independent sandbox receipt validation POST body.

export const SANDBOX_RECEIPT_VALIDATE_BODY_KEYS = ["receipt"] as const;

export function buildSandboxReceiptValidateRequestBody(receipt: unknown): Record<string, unknown> {
  return { receipt };
}
