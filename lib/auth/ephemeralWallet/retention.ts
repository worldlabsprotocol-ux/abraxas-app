// FILE: lib/auth/ephemeralWallet/retention.ts
// Documented TTLs for ephemeral security and sandbox state (not personal-data retention).

export const EPHEMERAL_TTL = {
  /** Wallet auth challenge (single-use). */
  authChallengeSec: 5 * 60,
  /** Browser wallet session JWT + active-session allowlist. */
  walletSessionSec: 4 * 60 * 60,
  /** Ephemeral sandbox workspace metadata. */
  sandboxWorkspaceSec: 24 * 60 * 60,
  /** Test API credential metadata (sandbox-only). */
  sandboxTestCredentialSec: 24 * 60 * 60,
  /** Signed test verification result references. */
  sandboxTestReceiptSec: 24 * 60 * 60,
} as const;
