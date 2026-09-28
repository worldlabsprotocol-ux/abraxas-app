// FILE: lib/partner/billing/solanaUsdc.ts
// Non-custodial Solana Pay requests and finalized USDC settlement verification.

import {
  Connection,
  Keypair,
  PublicKey,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  PARTNER_COMMERCIAL_PLANS,
  type PartnerCommercialPlanId,
} from "@/lib/partner/partnerCommercialPlans";

export type PaidPartnerPlanId = Extract<PartnerCommercialPlanId, "launch" | "scale">;
export type SolanaBillingCluster = "devnet" | "mainnet-beta";

export interface SolanaBillingConfig {
  cluster: SolanaBillingCluster;
  networkId: "solana_devnet" | "solana_mainnet";
  rpcUrl: string;
  recipient: PublicKey;
  tokenMint: PublicKey;
}

export interface SolanaBillingPayment {
  planId: PaidPartnerPlanId;
  amountMinor: number;
  amount: string;
  reference: string;
  paymentUrl: string;
}

export class SolanaBillingConfigurationError extends Error {
  constructor() {
    super("Solana USDC billing is not configured");
    this.name = "SolanaBillingConfigurationError";
  }
}

export function isPaidPartnerPlanId(value: unknown): value is PaidPartnerPlanId {
  return value === "launch" || value === "scale";
}

export function paidPlanAmountMinor(planId: PaidPartnerPlanId): number {
  const cents = PARTNER_COMMERCIAL_PLANS[planId].monthly_base_cents;
  if (cents == null || cents <= 0) throw new Error("paid_plan_price_unavailable");
  return cents * 10_000;
}

export function readSolanaBillingConfig(): SolanaBillingConfig {
  const cluster = (process.env.ABRAXAS_SOLANA_BILLING_CLUSTER ?? "").trim();
  const rpcUrl = (process.env.ABRAXAS_SOLANA_BILLING_RPC_URL ?? "").trim();
  const recipientRaw = (process.env.ABRAXAS_SOLANA_BILLING_RECIPIENT ?? "").trim();
  const mintRaw = (process.env.ABRAXAS_SOLANA_BILLING_USDC_MINT ?? "").trim();
  if ((cluster !== "devnet" && cluster !== "mainnet-beta") || !rpcUrl || !recipientRaw || !mintRaw) {
    throw new SolanaBillingConfigurationError();
  }
  try {
    return {
      cluster,
      networkId: cluster === "devnet" ? "solana_devnet" : "solana_mainnet",
      rpcUrl,
      recipient: new PublicKey(recipientRaw),
      tokenMint: new PublicKey(mintRaw),
    };
  } catch {
    throw new SolanaBillingConfigurationError();
  }
}

export function createSolanaBillingPayment(input: {
  planId: PaidPartnerPlanId;
  intentId: string;
  config: SolanaBillingConfig;
  reference?: PublicKey;
}): SolanaBillingPayment {
  const reference = input.reference ?? Keypair.generate().publicKey;
  const amountMinor = paidPlanAmountMinor(input.planId);
  const amount = (amountMinor / 1_000_000).toFixed(2);
  const params = new URLSearchParams({
    amount,
    "spl-token": input.config.tokenMint.toBase58(),
    reference: reference.toBase58(),
    label: "Abraxas",
    message: `${PARTNER_COMMERCIAL_PLANS[input.planId].label} plan · 30 days`,
    memo: input.intentId,
  });
  return {
    planId: input.planId,
    amountMinor,
    amount,
    reference: reference.toBase58(),
    paymentUrl: `solana:${input.config.recipient.toBase58()}?${params.toString()}`,
  };
}

function accountKeyStrings(transaction: ParsedTransactionWithMeta): string[] {
  return transaction.transaction.message.accountKeys.map((key) => key.pubkey.toBase58());
}

function rawTokenAmount(value: string | undefined): bigint {
  if (!value || !/^\d+$/.test(value)) return 0n;
  return BigInt(value);
}

export function transactionPaysBillingIntent(input: {
  transaction: ParsedTransactionWithMeta;
  reference: PublicKey;
  recipient: PublicKey;
  tokenMint: PublicKey;
  amountMinor: number;
  createdAtMs: number;
}): boolean {
  const { transaction } = input;
  if (transaction.meta?.err !== null || transaction.blockTime == null) return false;
  if (transaction.blockTime * 1000 + 5_000 < input.createdAtMs) return false;

  const keys = accountKeyStrings(transaction);
  if (!keys.includes(input.reference.toBase58())) return false;

  const recipientAta = getAssociatedTokenAddressSync(input.tokenMint, input.recipient).toBase58();
  const accountIndex = keys.indexOf(recipientAta);
  if (accountIndex < 0) return false;

  const before = transaction.meta?.preTokenBalances?.find(
    (balance) => balance.accountIndex === accountIndex && balance.mint === input.tokenMint.toBase58(),
  );
  const after = transaction.meta?.postTokenBalances?.find(
    (balance) => balance.accountIndex === accountIndex && balance.mint === input.tokenMint.toBase58(),
  );
  const delta = rawTokenAmount(after?.uiTokenAmount.amount) - rawTokenAmount(before?.uiTokenAmount.amount);
  return delta >= BigInt(input.amountMinor);
}

export async function findFinalizedSolanaBillingPayment(input: {
  config: SolanaBillingConfig;
  reference: string;
  amountMinor: number;
  createdAt: string;
}): Promise<string | null> {
  const reference = new PublicKey(input.reference);
  const connection = new Connection(input.config.rpcUrl, "finalized");
  const signatures = await connection.getSignaturesForAddress(reference, undefined, "finalized");

  for (const candidate of signatures.slice(0, 20)) {
    if (candidate.err) continue;
    const transaction = await connection.getParsedTransaction(candidate.signature, {
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    });
    if (transaction && transactionPaysBillingIntent({
      transaction,
      reference,
      recipient: input.config.recipient,
      tokenMint: input.config.tokenMint,
      amountMinor: input.amountMinor,
      createdAtMs: Date.parse(input.createdAt),
    })) {
      return candidate.signature;
    }
  }
  return null;
}
