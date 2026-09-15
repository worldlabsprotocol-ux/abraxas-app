// FILE: lib/settlement/accountingHooks.ts
// Monetization foundation hooks. Fees are never activated silently.

export type SettlementAccountingEventType =
  | "partner_subscription"
  | "verification_usage"
  | "settlement_usage"
  | "transaction_fee"
  | "enterprise_invoice";

export interface SettlementAccountingEvent {
  eventType: SettlementAccountingEventType;
  partnerId: string;
  applicationId: string;
  authorizationId?: string;
  amountMicroUsdc?: bigint;
  feeMicroUsdc?: bigint;
  currency: "USDC";
  visibleToUser: boolean;
  metadata: Record<string, string | number | boolean | null>;
}

export interface SettlementFeeQuote {
  baseAmountMicroUsdc: bigint;
  feeMicroUsdc: bigint;
  totalAmountMicroUsdc: bigint;
  feeLabel: string;
  feeActive: boolean;
}

/** Returns zero fee until an operator explicitly enables settlement fees. */
export function quoteSettlementFees(baseAmountMicroUsdc: bigint): SettlementFeeQuote {
  const feeEnabled = process.env.ABRAXAS_SETTLEMENT_FEE_ENABLED === "true";
  const feeBps = feeEnabled ? Number(process.env.ABRAXAS_SETTLEMENT_FEE_BPS ?? "0") : 0;
  const feeMicroUsdc = feeEnabled && feeBps > 0
    ? (baseAmountMicroUsdc * BigInt(feeBps)) / BigInt(10_000)
    : BigInt(0);
  return {
    baseAmountMicroUsdc,
    feeMicroUsdc,
    totalAmountMicroUsdc: baseAmountMicroUsdc + feeMicroUsdc,
    feeLabel: feeEnabled ? `Settlement fee ${feeBps} bps` : "No settlement fee",
    feeActive: feeEnabled && feeMicroUsdc > BigInt(0),
  };
}

export function buildSettlementAccountingEvent(
  input: Omit<SettlementAccountingEvent, "currency" | "visibleToUser"> & {
    visibleToUser?: boolean;
  },
): SettlementAccountingEvent {
  return {
    ...input,
    currency: "USDC",
    visibleToUser: input.visibleToUser ?? true,
  };
}
