// FILE: lib/partner/evmWalletBinding/challenge.ts
// Domain-bound short-lived EVM action challenge. No wallet address. No transaction.

import {
  EVM_WALLET_BINDING_PURPOSE,
  EVM_WALLET_MESSAGE_PROOF_ONLY,
  EVM_WALLET_NO_TRANSACTION,
  type EvmWalletChallengeView,
} from "@/lib/partner/evmWalletBinding/contract";
import { EvmWalletStoreUnavailableError } from "@/lib/partner/evmWalletBinding/errors";
import {
  hashEvmAction,
  hashEvmActionContractNonce,
  hashEvmChallengeMessage,
  hashEvmNetwork,
  hashEvmNonce,
  hashEvmOrigin,
  hashEvmPolicy,
} from "@/lib/partner/evmWalletBinding/hashes";
import { insertEvmWalletChallenge } from "@/lib/partner/evmWalletBinding/store";
import { isAllowedWalletStandardOrigin } from "@/lib/partner/walletStandard/challenge";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function buildEvmWalletChallengeMessage(input: {
  origin: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionScope: string;
  networkId: string;
  nonce: string;
  expiresAt: string;
}): string {
  return [
    "Abraxas EVM wallet-control proof",
    EVM_WALLET_NO_TRANSACTION,
    EVM_WALLET_MESSAGE_PROOF_ONLY,
    `Origin: ${input.origin}`,
    `Partner: ${input.partnerId}`,
    `Policy: ${input.policyId}`,
    `Policy-version: ${input.policyVersion}`,
    `Action: ${input.actionType}`,
    `Scope: ${input.actionScope}`,
    `Network: ${input.networkId}`,
    `Nonce: ${input.nonce}`,
    `Expires: ${input.expiresAt}`,
    `Purpose: ${EVM_WALLET_BINDING_PURPOSE}`,
  ].join("\n");
}

export async function issueEvmWalletChallenge(input: {
  origin: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionScope: string;
  networkId: string;
  actionContractNonce: string;
  now?: Date;
}): Promise<EvmWalletChallengeView | { ok: false; status: "invalid" | "wrong_origin" | "store_unavailable" }> {
  const origin = input.origin.trim();
  const partnerId = input.partnerId.trim();
  const policyId = input.policyId.trim();
  const actionType = input.actionType.trim();
  const actionScope = input.actionScope.trim();
  const networkId = input.networkId.trim();
  const actionContractNonce = input.actionContractNonce.trim();
  if (!partnerId || !policyId || !actionType || !actionScope || !networkId || !actionContractNonce) {
    return { ok: false, status: "invalid" };
  }
  if (!Number.isInteger(input.policyVersion) || input.policyVersion < 1) {
    return { ok: false, status: "invalid" };
  }
  if (!isAllowedWalletStandardOrigin(origin)) {
    return { ok: false, status: "wrong_origin" };
  }
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString();
  const nonce = createId("chn");
  const challengeId = createId("ewc");
  const message = buildEvmWalletChallengeMessage({
    origin,
    partnerId,
    policyId,
    policyVersion: input.policyVersion,
    actionType,
    actionScope,
    networkId,
    nonce,
    expiresAt,
  });
  try {
    await insertEvmWalletChallenge({
      challenge_id: challengeId,
      partner_id: partnerId,
      origin_hash: hashEvmOrigin(origin),
      policy_hash: hashEvmPolicy(partnerId, policyId, input.policyVersion),
      action_hash: hashEvmAction(partnerId, actionType, actionScope),
      network_hash: hashEvmNetwork(partnerId, networkId),
      action_contract_nonce_hash: hashEvmActionContractNonce(partnerId, actionContractNonce),
      nonce_hash: hashEvmNonce(partnerId, nonce),
      message_hash: hashEvmChallengeMessage(message),
      expires_at: expiresAt,
      reason_class: "issued",
    });
  } catch (error) {
    if (error instanceof EvmWalletStoreUnavailableError) {
      return { ok: false, status: "store_unavailable" };
    }
    throw error;
  }
  return {
    challenge_id: challengeId,
    message,
    expires_at: expiresAt,
    purpose: EVM_WALLET_BINDING_PURPOSE,
  };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
