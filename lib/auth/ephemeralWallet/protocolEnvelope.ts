// FILE: lib/auth/ephemeralWallet/protocolEnvelope.ts
// Canonical Abraxas wallet authorization envelope (SIWS-style, purpose-separated).

import { WALLET_MESSAGE_ONLY_FUNDS_LINES } from "./walletMessageSafetyCopy";

export const ABRAXAS_WALLET_PROTOCOL_ID = "abraxas-wallet-trust" as const;
export const ABRAXAS_WALLET_PROTOCOL_VERSION = "1" as const;
export const ABRAXAS_PROTOCOL_DISPLAY_NAME = "Abraxas" as const;

export const WALLET_SIGN_IN_MESSAGE_HEADER = "ABRAXAS — WALLET SIGN-IN" as const;

/** Sign-in only — never authorizes transfers, issuance, or production policy changes. */
export const WALLET_AUTH_PURPOSE_SIGN_IN = "abraxas_wallet_sign_in_v1" as const;

export const WALLET_AUTH_PURPOSE_SANDBOX_ENTER = "abraxas_action_sandbox_enter_v1" as const;
export const WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY =
  "abraxas_action_sandbox_test_verify_v1" as const;

export type WalletAuthorizationPurpose =
  | typeof WALLET_AUTH_PURPOSE_SIGN_IN
  | typeof WALLET_AUTH_PURPOSE_SANDBOX_ENTER
  | typeof WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY;

export type WalletAuthorizationHumanContext = {
  actionTitle: string;
  policyLabel?: string | null;
  policyId?: string | null;
  environment?: string | null;
  requestedBy?: string | null;
  fundsSafetyLine?: string | null;
};

export function formatWalletAuthorizationExpires(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }) + " UTC"
    );
  } catch {
    return iso;
  }
}

export function buildWalletSignInHumanSection(input: {
  domain: string;
  walletAddress: string;
  expiresAt: string;
}): string[] {
  return [
    WALLET_SIGN_IN_MESSAGE_HEADER,
    "",
    "Verify control of your wallet to sign in to Abraxas.",
    "",
    ...WALLET_MESSAGE_ONLY_FUNDS_LINES,
    "",
    `Requested by: ${input.domain}`,
    `Wallet: ${input.walletAddress}`,
    `Expires: ${formatWalletAuthorizationExpires(input.expiresAt)}`,
  ];
}

export function buildScopedWalletActionHumanSection(input: {
  human: WalletAuthorizationHumanContext;
  walletAddress: string;
  expiresAt: string;
  requestId: string;
}): string[] {
  const header = input.human.actionTitle.trim().toUpperCase();
  const lines: string[] = [`ABRAXAS — ${header}`, ""];

  if (input.human.actionTitle.trim()) {
    lines.push(`${input.human.actionTitle.trim()} in Abraxas.`, "");
  }

  const safetyLines = input.human.fundsSafetyLine?.trim()
    ? [input.human.fundsSafetyLine.trim()]
    : [...WALLET_MESSAGE_ONLY_FUNDS_LINES];
  lines.push(...safetyLines, "");

  const policyLabel = input.human.policyLabel?.trim();
  const policyId = input.human.policyId?.trim();
  if (policyLabel && policyId) {
    lines.push(`Policy: ${policyLabel} (${policyId})`);
  } else if (policyId) {
    lines.push(`Policy: ${policyId}`);
  } else if (policyLabel) {
    lines.push(`Policy: ${policyLabel}`);
  }
  if (input.human.environment?.trim()) {
    lines.push(`Environment: ${input.human.environment.trim()}`);
  }
  if (input.human.requestedBy?.trim()) {
    lines.push(`Requested by: ${input.human.requestedBy.trim()}`);
  }
  lines.push(
    `Wallet: ${input.walletAddress}`,
    `Expires: ${formatWalletAuthorizationExpires(input.expiresAt)}`,
    `Request ID: ${input.requestId}`,
  );
  return lines;
}

/** @deprecated Prefer purpose-specific sections; kept for tests migrating off legacy layout. */
export function buildWalletAuthorizationHumanPreamble(input: {
  human: WalletAuthorizationHumanContext;
  walletAddress: string;
  expiresAt: string;
  requestId: string;
}): string[] {
  return buildScopedWalletActionHumanSection(input);
}

export function buildWalletAuthorizationMessage(input: {
  domain: string;
  audience: string;
  walletAddress: string;
  uri: string;
  solanaNetwork: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  requestId: string;
  origin: string;
  purpose: WalletAuthorizationPurpose;
  operation: string;
  resource: string;
  policyId?: string | null;
  human?: WalletAuthorizationHumanContext | null;
}): string {
  const policyLine =
    input.policyId && input.policyId.trim()
      ? `Policy ID: ${input.policyId.trim()}`
      : "Policy ID: (none)";

  const technical = [
    `${input.domain} requests Abraxas wallet authorization:`,
    input.walletAddress,
    "",
    `Protocol ID: ${ABRAXAS_WALLET_PROTOCOL_ID}`,
    `Protocol Version: ${ABRAXAS_WALLET_PROTOCOL_VERSION}`,
    `Audience: ${input.audience}`,
    `URI: ${input.uri}`,
    "Version: 1",
    `Chain ID: ${input.solanaNetwork}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    `Request ID: ${input.requestId}`,
    `Origin: ${input.origin}`,
    `Purpose: ${input.purpose}`,
    `Operation: ${input.operation}`,
    `Resource: ${input.resource}`,
    policyLine,
  ];

  if (input.purpose === WALLET_AUTH_PURPOSE_SIGN_IN) {
    const humanSection = buildWalletSignInHumanSection({
      domain: input.domain,
      walletAddress: input.walletAddress,
      expiresAt: input.expiresAt,
    });
    return [...humanSection, "", "---", "Authorization record", ...technical.slice(2)].join("\n");
  }

  if (!input.human) {
    return technical.join("\n");
  }

  const humanSection = buildScopedWalletActionHumanSection({
    human: input.human,
    walletAddress: input.walletAddress,
    expiresAt: input.expiresAt,
    requestId: input.requestId,
  });

  return [...humanSection, "", "---", "Authorization record", ...technical.slice(2)].join("\n");
}
