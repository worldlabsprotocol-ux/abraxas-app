// FILE: lib/auth/walletAuthorization/scopedExecutionEnvelope.ts
// Build #853 — tenant + application + action binding on the canonical wallet envelope.

import {
  ABRAXAS_WALLET_PROTOCOL_ID,
  buildWalletAuthorizationMessage,
  type WalletAuthorizationHumanContext,
  WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
} from "@/lib/auth/ephemeralWallet/protocolEnvelope";

/** Scoped trust execution (not sign-in). */
export const WALLET_AUTH_PURPOSE_TRUST_EXECUTION = "abraxas_wallet_trust_execution_v1" as const;

export type WalletScopedTrustBinding = {
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
  /** Tenant (partner) identifier. */
  partnerId: string;
  /** Launchpad application UUID when action is app-scoped. */
  applicationId: string | null;
  /** Machine action identifier (maps to Operation). */
  action: string;
  resource: string;
  policyId: string;
  human?: WalletAuthorizationHumanContext | null;
};

const TENANT_PREFIX = "Tenant ID: ";
const APPLICATION_PREFIX = "Application ID: ";

export function buildWalletScopedTrustExecutionMessage(input: WalletScopedTrustBinding): string {
  const base = buildWalletAuthorizationMessage({
    domain: input.domain,
    audience: input.audience,
    walletAddress: input.walletAddress,
    uri: input.uri,
    solanaNetwork: input.solanaNetwork,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    requestId: input.requestId,
    origin: input.origin,
    purpose: WALLET_AUTH_PURPOSE_TRUST_EXECUTION,
    operation: input.action,
    resource: input.resource,
    policyId: input.policyId,
    human: input.human,
  });
  const bindingLines = [
    `${TENANT_PREFIX}${input.partnerId.trim()}`,
    `${APPLICATION_PREFIX}${input.applicationId?.trim() || "(none)"}`,
  ];
  const marker = `Protocol ID: ${ABRAXAS_WALLET_PROTOCOL_ID}`;
  const idx = base.indexOf(marker);
  if (idx < 0) {
    return `${base}\n${bindingLines.join("\n")}`;
  }
  return `${base.slice(0, idx)}${bindingLines.join("\n")}\n${base.slice(idx)}`;
}

export function parseWalletScopedTrustExecutionBinding(message: string): WalletScopedTrustBinding | null {
  const tenantLine = message
    .split("\n")
    .find((l) => l.startsWith(TENANT_PREFIX));
  const appLine = message.split("\n").find((l) => l.startsWith(APPLICATION_PREFIX));
  if (!tenantLine || !appLine) return null;

  const partnerId = tenantLine.slice(TENANT_PREFIX.length).trim();
  const appRaw = appLine.slice(APPLICATION_PREFIX.length).trim();
  const applicationId = appRaw === "(none)" ? null : appRaw;

  const read = (label: string): string | null => {
    const prefix = `${label}: `;
    const line = message.split("\n").find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : null;
  };

  const domainMatch = message.match(/^(.+?) requests Abraxas wallet authorization:/m);
  const domain = domainMatch?.[1]?.trim() ?? "";
  const walletLine = message.match(/^([1-9A-HJ-NP-Za-km-z]{32,44})$/m);
  const walletAddress = walletLine?.[1] ?? read("Wallet") ?? "";

  const nonce = read("Nonce");
  const expiresAt = read("Expiration Time");
  const issuedAt = read("Issued At");
  const requestId = read("Request ID");
  const audience = read("Audience");
  const uri = read("URI");
  const chain = read("Chain ID");
  const origin = read("Origin");
  const operation = read("Operation");
  const resource = read("Resource");
  const policyRaw = read("Policy ID");

  if (
    !partnerId
    || !nonce
    || !expiresAt
    || !issuedAt
    || !requestId
    || !audience
    || !uri
    || !chain
    || !origin
    || !operation
    || !resource
    || !policyRaw
    || policyRaw === "(none)"
    || !walletAddress
  ) {
    return null;
  }

  return {
    domain,
    audience,
    walletAddress,
    uri,
    solanaNetwork: chain,
    nonce,
    issuedAt,
    expiresAt,
    requestId,
    origin,
    partnerId,
    applicationId,
    action: operation,
    resource,
    policyId: policyRaw,
  };
}

/** @deprecated Use WALLET_AUTH_PURPOSE_TRUST_EXECUTION for new protocol paths. */
export const LEGACY_SANDBOX_VERIFY_PURPOSE = WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY;
