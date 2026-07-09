// FILE: lib/walletAuthority/evmSiwe.ts
// EVM wallet binding via SIWE-compatible signed messages.

import { createHash, randomBytes } from "crypto";
import { verifyMessage, getAddress } from "viem";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function normalizeEvmAddress(address: string): string {
  return getAddress(address);
}

export function buildSiweMessage(input: {
  domain: string;
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
}): string {
  const address = normalizeEvmAddress(input.address);
  const lines = [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    input.statement ?? "Bind this wallet to your Abraxas Passport.",
    "",
    `URI: https://${input.domain}`,
    `Version: 1`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ];
  return lines.join("\n");
}

export function createEvmChallengePayload(input: {
  domain: string;
  address: string;
  chainId: number;
}): { challengeId: string; message: string; expiresAt: string; domain: string; chainId: number } {
  const challengeId = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const message = buildSiweMessage({
    domain: input.domain,
    address: input.address,
    chainId: input.chainId,
    nonce: challengeId,
    issuedAt,
    expirationTime: expiresAt,
    statement: "Bind this wallet to your Abraxas Passport. This signature does not authorize a transaction.",
  });
  return {
    challengeId,
    message,
    expiresAt,
    domain: input.domain,
    chainId: input.chainId,
  };
}

export async function verifyEvmBindingSignature(input: {
  message: string;
  signature: `0x${string}`;
  expectedAddress: string;
  expectedDomain: string;
  expectedChainId: number;
  expectedNonce: string;
}): Promise<boolean> {
  try {
    const address = normalizeEvmAddress(input.expectedAddress);
    if (!input.message.includes(input.expectedDomain)) return false;
    if (!input.message.includes(`Chain ID: ${input.expectedChainId}`)) return false;
    if (!input.message.includes(`Nonce: ${input.expectedNonce}`)) return false;

    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message: input.message,
      signature: input.signature.startsWith("0x") ? input.signature as `0x${string}` : `0x${input.signature}` as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}

export function messageHash(message: string): string {
  return createHash("sha256").update(message, "utf8").digest("hex");
}
