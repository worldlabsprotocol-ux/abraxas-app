// FILE: lib/settlement/SettlementConfirmationVerifier.server.ts
// Independent onchain settlement confirmation. Never trusts browser supplied events.

import "server-only";

import {
  decodeEventLog,
  type Hex,
  type Log,
} from "viem";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/settlement/constants";
import { PROOF_GATED_SETTLEMENT_ABI } from "@/lib/settlement/contractAbi";
import {
  fetchArcChainId,
  fetchArcTransactionReceipt,
  withArcRpcRetry,
} from "@/lib/settlement/arcRpc.server";
import { applicationIdToBytes32, hashSettlementReference } from "@/lib/settlement/receiptCommitment";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import type { ArcAuthorizationRow, ArcSettlementConfigRow } from "@/lib/settlement/types";
import { normalizeEvmAddress } from "@/lib/settlement/validation";
import { createArcPublicClient } from "@/lib/settlement/arcRpc.server";

export interface VerifiedSettlementExecution {
  transactionHash: Hex;
  blockNumber: number;
  payerWallet: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amountMicroUsdc: bigint;
  nonce: Hex;
  partnerApplicationId: Hex;
  receiptCommitment: Hex;
  settlementReference: Hex;
  chainId: number;
}

export type SettlementConfirmationVerifyResult =
  | { ok: true; execution: VerifiedSettlementExecution }
  | { ok: false; code: string };

function normalizeTxHash(hash: string): Hex | null {
  const trimmed = hash.trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(trimmed)) return null;
  return trimmed as Hex;
}

function findSettlementExecutedLog(
  logs: Log[],
  contractAddress: `0x${string}`,
): VerifiedSettlementExecution | null {
  const target = contractAddress.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    try {
      const decoded = decodeEventLog({
        abi: PROOF_GATED_SETTLEMENT_ABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      });
      if (decoded.eventName !== "SettlementExecuted") continue;
      const args = decoded.args as {
        payer: `0x${string}`;
        recipient: `0x${string}`;
        token: `0x${string}`;
        amountMicroUsdc: bigint;
        nonce: Hex;
        partnerApplicationId: Hex;
        receiptCommitment: Hex;
        settlementReference: Hex;
      };
      return {
        transactionHash: log.transactionHash as Hex,
        blockNumber: Number(log.blockNumber),
        payerWallet: normalizeEvmAddress(args.payer) as `0x${string}`,
        recipient: normalizeEvmAddress(args.recipient) as `0x${string}`,
        token: normalizeEvmAddress(args.token) as `0x${string}`,
        amountMicroUsdc: args.amountMicroUsdc,
        nonce: args.nonce,
        partnerApplicationId: args.partnerApplicationId,
        receiptCommitment: args.receiptCommitment,
        settlementReference: args.settlementReference,
        chainId: ARC_TESTNET_CHAIN_ID,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function verifySettlementOnchain(input: {
  transactionHash: string;
  config: ArcSettlementConfigRow;
  authorization: ArcAuthorizationRow;
}): Promise<SettlementConfirmationVerifyResult> {
  const txHash = normalizeTxHash(input.transactionHash);
  if (!txHash) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }

  const contract = normalizeEvmAddress(input.config.settlement_contract_address ?? "");
  const configuredToken = normalizeEvmAddress(input.config.usdc_token_address);
  const configuredRecipient = normalizeEvmAddress(input.config.approved_recipient);
  if (!contract || !configuredToken || !configuredRecipient) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.contract_not_configured };
  }

  if (input.config.chain_id !== ARC_TESTNET_CHAIN_ID) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.environment_mismatch };
  }

  const chainId = await fetchArcChainId();
  if (chainId === null) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed };
  }
  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.environment_mismatch };
  }

  const receipt = await fetchArcTransactionReceipt(txHash);
  if (!receipt) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed };
  }
  if (receipt.status !== "success") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed };
  }

  const client = createArcPublicClient();
  const transaction = await withArcRpcRetry(() => client.getTransaction({ hash: txHash })).catch(() => null);
  if (!transaction) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed };
  }
  if (!transaction.to || transaction.to.toLowerCase() !== contract.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }

  const execution = findSettlementExecutedLog(receipt.logs, contract);
  if (!execution) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed };
  }

  const auth = input.authorization;
  const expectedAppId = applicationIdToBytes32(auth.application_id);
  const expectedNonce = auth.nonce.toLowerCase() as Hex;

  if (auth.environment !== "sandbox") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.environment_mismatch };
  }

  if (execution.payerWallet.toLowerCase() !== normalizeEvmAddress(auth.eligible_wallet)?.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.wallet_mismatch };
  }
  if (execution.recipient.toLowerCase() !== configuredRecipient.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.recipient_not_allowed };
  }
  if (execution.token.toLowerCase() !== configuredToken.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.token_not_allowed };
  }
  if (execution.amountMicroUsdc !== BigInt(auth.amount_micro_usdc)) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }
  if (execution.nonce.toLowerCase() !== expectedNonce) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }
  if (execution.partnerApplicationId.toLowerCase() !== expectedAppId.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }
  if (execution.receiptCommitment.toLowerCase() !== auth.receipt_commitment.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }

  let hashedReference: Hex;
  try {
    hashedReference = hashSettlementReference(auth.settlement_reference);
  } catch {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }
  if (execution.settlementReference.toLowerCase() !== hashedReference.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }

  return { ok: true, execution };
}
