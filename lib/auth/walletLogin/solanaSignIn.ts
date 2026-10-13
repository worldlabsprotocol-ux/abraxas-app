// FILE: lib/auth/walletLogin/solanaSignIn.ts
// Solana Sign-In (SIWS-style) challenge messages and ed25519 verification.

import { createHash, randomBytes } from "crypto";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export const SOLANA_LOGIN_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

export function normalizeSolanaAddress(address: string): string {
  const trimmed = address.trim();
  try {
    return new PublicKey(trimmed).toBase58();
  } catch {
    throw new Error("Invalid Solana address");
  }
}

export function createLoginNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function createLoginChallengeId(): string {
  return `hwlc_${randomBytes(18).toString("base64url")}`;
}

export interface SolanaSignInMessageFields {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement: string;
}

export function buildSolanaSignInMessage(input: {
  domain: string;
  address: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
}): string {
  const address = normalizeSolanaAddress(input.address);
  const statement = input.statement ?? "Sign in to Abraxas. No blockchain transaction or fee.";
  return [
    `${input.domain} wants you to sign in with your Solana account:`,
    address,
    "",
    statement,
    "",
    `URI: https://${input.domain}`,
    `Version: 1`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join("\n");
}

export function parseSolanaSignInMessage(message: string): SolanaSignInMessageFields | null {
  try {
    const lines = message.split("\n");
    const domainMatch = lines[0]?.match(/^(.+) wants you to sign in with your Solana account:$/);
    if (!domainMatch?.[1]) return null;
    const address = normalizeSolanaAddress(lines[1] ?? "");
    if (lines[2] !== "") return null;
    let i = 3;
    const statementLines: string[] = [];
    while (i < lines.length && lines[i] !== "") {
      statementLines.push(lines[i]!);
      i += 1;
    }
    if (lines[i] !== "") return null;
    i += 1;

    const fields: Record<string, string> = {};
    while (i < lines.length) {
      const line = lines[i] ?? "";
      const idx = line.indexOf(": ");
      if (idx > 0) {
        fields[line.slice(0, idx)] = line.slice(idx + 2);
      }
      i += 1;
    }

    if (!fields.URI || !fields.Nonce || !fields["Issued At"] || !fields["Expiration Time"]) {
      return null;
    }

    return {
      domain: domainMatch[1],
      address,
      uri: fields.URI,
      version: fields.Version ?? "1",
      chainId: fields["Chain ID"] ?? "mainnet",
      nonce: fields.Nonce,
      issuedAt: fields["Issued At"],
      expirationTime: fields["Expiration Time"],
      statement: statementLines.join("\n"),
    };
  } catch {
    return null;
  }
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = Buffer.from(padded, "base64");
  return new Uint8Array(binary);
}

export function verifySolanaSignInSignature(input: {
  message: string;
  signatureBase64: string;
  expectedAddress: string;
  expectedDomain: string;
  expectedNonce: string;
  expectedChainId: string;
  nowMs?: number;
}): { ok: true } | { ok: false; reason: string } {
  const parsed = parseSolanaSignInMessage(input.message);
  if (!parsed) return { ok: false, reason: "message_parse_failed" };

  const now = input.nowMs ?? Date.now();
  const issuedAt = Date.parse(parsed.issuedAt);
  const expiresAt = Date.parse(parsed.expirationTime);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: "message_time_invalid" };
  }
  if (now > expiresAt + CLOCK_SKEW_MS) return { ok: false, reason: "challenge_expired" };
  if (issuedAt > now + CLOCK_SKEW_MS) return { ok: false, reason: "challenge_not_yet_valid" };
  if (now - issuedAt > SOLANA_LOGIN_CHALLENGE_TTL_MS + CLOCK_SKEW_MS) {
    return { ok: false, reason: "challenge_stale" };
  }

  let expectedAddress: string;
  try {
    expectedAddress = normalizeSolanaAddress(input.expectedAddress);
  } catch {
    return { ok: false, reason: "address_invalid" };
  }

  if (parsed.address !== expectedAddress) return { ok: false, reason: "address_mismatch" };
  if (parsed.domain !== input.expectedDomain) return { ok: false, reason: "domain_mismatch" };
  if (parsed.nonce !== input.expectedNonce) return { ok: false, reason: "nonce_mismatch" };
  if (parsed.chainId !== input.expectedChainId) return { ok: false, reason: "chain_mismatch" };

  let signature: Uint8Array;
  let publicKey: Uint8Array;
  try {
    signature = base64ToBytes(input.signatureBase64);
    publicKey = new PublicKey(expectedAddress).toBytes();
  } catch {
    return { ok: false, reason: "signature_format_invalid" };
  }

  const messageBytes = new TextEncoder().encode(input.message);
  const valid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
  if (!valid) return { ok: false, reason: "signature_invalid" };

  return { ok: true };
}

export function hashForAudit(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}
