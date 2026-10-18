// FILE: lib/auth/ephemeralWallet/retention.ts
// Documented TTLs for ephemeral security and sandbox state (not personal-data retention).

export const EPHEMERAL_TTL = {
  /** Wallet auth challenge (single-use). */
  authChallengeSec: 5 * 60,
  /** Short-lived capability JWT (optional allowlist when configured). */
  walletSessionSec: 30 * 60,
  /** Ephemeral sandbox workspace metadata. */
  sandboxWorkspaceSec: 24 * 60 * 60,
  /** Test API credential metadata (sandbox-only). */
  sandboxTestCredentialSec: 24 * 60 * 60,
  /** Signed test verification result references. */
  sandboxTestReceiptSec: 24 * 60 * 60,
} as const;
