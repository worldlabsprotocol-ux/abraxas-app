// FILE: lib/walletAuthority/evmSiwe.ts
// EVM wallet binding via SIWE-compatible signed messages.

import { createHash, randomBytes } from "crypto";
import { getAddress, isAddress, verifyMessage } from "viem";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const ISSUED_AT_MAX_AGE_MS = CHALLENGE_TTL_MS;
const CLOCK_SKEW_MS = 60 * 1000;

export function normalizeEvmAddress(address: string): string {
  if (!address || typeof address !== "string") {
    throw new Error("Invalid EVM address");
  }
  const trimmed = address.trim();
  if (!isAddress(trimmed)) {
    throw new Error("Invalid EVM address format");
  }
  return getAddress(trimmed);
}

export function expectedSiweUri(domain: string): string {
  return `https://${domain}`;
}

export interface ParsedSiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
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
    `URI: ${expectedSiweUri(input.domain)}`,
    `Version: 1`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ];
  return lines.join("\n");
}

export function parseSiweMessage(message: string): ParsedSiweMessage | null {
  try {
    const lines = message.split("\n");
    const domainMatch = lines[0]?.match(/^(.+) wants you to sign in with your Ethereum account:$/);
    if (!domainMatch?.[1]) return null;

    const address = normalizeEvmAddress(lines[1] ?? "");
    if (lines[2] !== "") return null;

    let i = 3;
    const statementLines: string[] = [];
    while (i < lines.length && lines[i] !== "") {
      statementLines.push(lines[i]!);
      i += 1;
    }
    if (lines[i] !== "") return null;
    i += 1;

    const uriLine = lines[i++];
    const versionLine = lines[i++];
    const chainLine = lines[i++];
    const nonceLine = lines[i++];
    const issuedLine = lines[i++];
    const expirationLine = lines[i++];

    if (
      !uriLine?.startsWith("URI: ")
      || !versionLine?.startsWith("Version: ")
      || !chainLine?.startsWith("Chain ID: ")
      || !nonceLine?.startsWith("Nonce: ")
      || !issuedLine?.startsWith("Issued At: ")
      || !expirationLine?.startsWith("Expiration Time: ")
      || i !== lines.length
    ) {
      return null;
    }

    const chainId = Number.parseInt(chainLine.slice("Chain ID: ".length), 10);
    if (!Number.isFinite(chainId)) return null;

    return {
      domain: domainMatch[1],
      address,
      statement: statementLines.join("\n"),
      uri: uriLine.slice("URI: ".length),
      version: versionLine.slice("Version: ".length),
      nonce: nonceLine.slice("Nonce: ".length),
      issuedAt: issuedLine.slice("Issued At: ".length),
      expirationTime: expirationLine.slice("Expiration Time: ".length),
      chainId,
    };
  } catch {
    return null;
  }
}

export function validateSiweMessage(
  message: string,
  expected: {
    domain: string;
    chainId: number;
    nonce: string;
    address: string;
  },
  nowMs = Date.now(),
): { ok: true; parsed: ParsedSiweMessage } | { ok: false; reason: string } {
  const parsed = parseSiweMessage(message);
  if (!parsed) return { ok: false, reason: "parse_failed" };

  const rebuilt = buildSiweMessage({
    domain: parsed.domain,
    address: parsed.address,
    chainId: parsed.chainId,
    nonce: parsed.nonce,
    issuedAt: parsed.issuedAt,
    expirationTime: parsed.expirationTime,
    statement: parsed.statement,
  });
  if (rebuilt !== message) return { ok: false, reason: "message_tampered" };

  if (parsed.domain !== expected.domain) return { ok: false, reason: "domain_mismatch" };
  if (parsed.chainId !== expected.chainId) return { ok: false, reason: "chain_id_mismatch" };
  if (parsed.nonce !== expected.nonce) return { ok: false, reason: "nonce_mismatch" };
  if (parsed.address.toLowerCase() !== normalizeEvmAddress(expected.address).toLowerCase()) {
    return { ok: false, reason: "address_mismatch" };
  }
  if (parsed.uri !== expectedSiweUri(expected.domain)) return { ok: false, reason: "uri_mismatch" };
  if (parsed.version !== "1") return { ok: false, reason: "version_mismatch" };

  const issuedAtMs = Date.parse(parsed.issuedAt);
  const expirationMs = Date.parse(parsed.expirationTime);
  if (Number.isNaN(issuedAtMs) || Number.isNaN(expirationMs)) {
    return { ok: false, reason: "invalid_timestamps" };
  }
  if (issuedAtMs > nowMs + CLOCK_SKEW_MS) return { ok: false, reason: "issued_at_in_future" };
  if (nowMs - issuedAtMs > ISSUED_AT_MAX_AGE_MS) return { ok: false, reason: "issued_at_too_old" };
  if (expirationMs <= nowMs) return { ok: false, reason: "expiration_passed" };

  return { ok: true, parsed };
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
  nowMs?: number;
}): Promise<boolean> {
  try {
    const validation = validateSiweMessage(
      input.message,
      {
        domain: input.expectedDomain,
        chainId: input.expectedChainId,
        nonce: input.expectedNonce,
        address: input.expectedAddress,
      },
      input.nowMs,
    );
    if (!validation.ok) return false;

    const address = normalizeEvmAddress(input.expectedAddress);
    const signature = input.signature.startsWith("0x")
      ? input.signature as `0x${string}`
      : `0x${input.signature}` as `0x${string}`;

    return verifyMessage({
      address: address as `0x${string}`,
      message: input.message,
      signature,
    });
  } catch {
    return false;
  }
}

export function messageHash(message: string): string {
  return createHash("sha256").update(message, "utf8").digest("hex");
}
