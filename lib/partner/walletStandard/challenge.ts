// FILE: lib/partner/walletStandard/challenge.ts
// Domain-bound short-lived challenge. No wallet address. No transaction.

import { WALLET_STANDARD_PURPOSE, type WalletStandardChallengeView } from "@/lib/partner/walletStandard/contract";
import { putWalletChallenge } from "@/lib/partner/walletStandard/store";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function isAllowedWalletStandardOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "http:") {
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    }
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname.includes("*")) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildWalletStandardMessage(input: {
  origin: string;
  partnerId: string;
  actionContractNonce: string;
  nonce: string;
  expiresAt: string;
}): string {
  return [
    "Abraxas wallet binding",
    `Origin: ${input.origin}`,
    `Partner: ${input.partnerId}`,
    `Action-contract: ${input.actionContractNonce}`,
    `Nonce: ${input.nonce}`,
    `Expires: ${input.expiresAt}`,
    `Purpose: ${WALLET_STANDARD_PURPOSE}`,
  ].join("\n");
}

export function issueWalletStandardChallenge(input: {
  origin: string;
  partnerId: string;
  actionContractNonce: string;
  now?: Date;
}): WalletStandardChallengeView | { ok: false; status: "invalid" | "wrong_origin" } {
  const origin = input.origin.trim();
  const partnerId = input.partnerId.trim();
  const actionContractNonce = input.actionContractNonce.trim();
  if (!partnerId || !actionContractNonce) {
    return { ok: false, status: "invalid" };
  }
  if (!isAllowedWalletStandardOrigin(origin)) {
    return { ok: false, status: "wrong_origin" };
  }
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString();
  const nonce = createId("chn");
  const challengeId = createId("wsc");
  const message = buildWalletStandardMessage({
    origin,
    partnerId,
    actionContractNonce,
    nonce,
    expiresAt,
  });
  putWalletChallenge({
    challenge_id: challengeId,
    origin,
    partner_id: partnerId,
    action_contract_nonce: actionContractNonce,
    nonce,
    expires_at: expiresAt,
    purpose: WALLET_STANDARD_PURPOSE,
    consumed: false,
  });
  return {
    challenge_id: challengeId,
    message,
    expires_at: expiresAt,
    purpose: WALLET_STANDARD_PURPOSE,
  };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
