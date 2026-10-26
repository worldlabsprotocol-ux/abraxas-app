// FILE: lib/auth/ephemeralWallet/walletAuthorizationPurpose.ts
// Canonical wallet authorization purpose classification (no unrestricted strings).

import {
  WALLET_AUTH_PURPOSE_SIGN_IN,
  WALLET_AUTH_PURPOSE_SANDBOX_ENTER,
  WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
  WALLET_AUTH_PURPOSE_TRUST_EXECUTION,
  WALLET_AUTHORIZATION_PURPOSES,
  type WalletAuthorizationPurpose,
} from "./protocolEnvelope";

const PURPOSE_LINE_PREFIX = "Purpose: ";

export function parseWalletAuthorizationPurposeFromMessage(
  message: string,
): WalletAuthorizationPurpose | null {
  const line = message.split("\n").find((l) => l.startsWith(PURPOSE_LINE_PREFIX));
  if (!line) return null;
  const value = line.slice(PURPOSE_LINE_PREFIX.length).trim();
  return isWalletAuthorizationPurpose(value) ? value : null;
}

export function isWalletAuthorizationPurpose(value: string): value is WalletAuthorizationPurpose {
  return (WALLET_AUTHORIZATION_PURPOSES as readonly string[]).includes(value);
}

export function isWalletSignInPurpose(purpose: WalletAuthorizationPurpose): boolean {
  return purpose === WALLET_AUTH_PURPOSE_SIGN_IN;
}

export function isWalletSandboxActionPurpose(purpose: WalletAuthorizationPurpose): boolean {
  return purpose === WALLET_AUTH_PURPOSE_SANDBOX_ENTER
    || purpose === WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY;
}

export function isWalletScopedTrustExecutionPurpose(purpose: WalletAuthorizationPurpose): boolean {
  return purpose === WALLET_AUTH_PURPOSE_TRUST_EXECUTION;
}

export function assertPurposeAllowedForSignInVerification(
  purpose: WalletAuthorizationPurpose | undefined | null,
): { ok: true } | { ok: false; code: "wrong_purpose" } {
  if (!purpose || !isWalletSignInPurpose(purpose)) {
    return { ok: false, code: "wrong_purpose" };
  }
  return { ok: true };
}

export function assertPurposeAllowedForSandboxActionVerification(
  purpose: WalletAuthorizationPurpose | undefined | null,
): { ok: true } | { ok: false; code: "wrong_purpose" } {
  if (!purpose || !isWalletSandboxActionPurpose(purpose)) {
    return { ok: false, code: "wrong_purpose" };
  }
  return { ok: true };
}

export function assertPurposeAllowedForTrustExecutionVerification(
  purpose: WalletAuthorizationPurpose | undefined | null,
): { ok: true } | { ok: false; code: "wrong_purpose" } {
  if (!purpose || !isWalletScopedTrustExecutionPurpose(purpose)) {
    return { ok: false, code: "wrong_purpose" };
  }
  return { ok: true };
}
