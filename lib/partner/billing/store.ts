// FILE: lib/partner/billing/store.ts
// Service-role-only payment intent storage. Public responses use billingIntentView.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { PaidPartnerPlanId, SolanaBillingConfig, SolanaBillingPayment } from "./solanaUsdc";

export type PartnerBillingIntentStatus = "pending" | "confirmed" | "expired";

export interface PartnerBillingIntent {
  intentId: string;
  partnerId: string;
  applicationId: string;
  planId: PaidPartnerPlanId;
  networkId: "solana_devnet" | "solana_mainnet";
  recipient: string;
  tokenMint: string;
  amountMinor: number;
  reference: string;
  status: PartnerBillingIntentStatus;
  transactionSignature: string | null;
  expiresAt: string;
  createdAt: string;
  confirmedAt: string | null;
}

function mapIntent(row: Record<string, unknown>): PartnerBillingIntent {
  return {
    intentId: String(row.intent_id),
    partnerId: String(row.partner_id),
    applicationId: String(row.application_id),
    planId: row.plan_id as PaidPartnerPlanId,
    networkId: row.network_id as PartnerBillingIntent["networkId"],
    recipient: String(row.recipient),
    tokenMint: String(row.token_mint),
    amountMinor: Number(row.amount_minor),
    reference: String(row.reference_pubkey),
    status: row.status as PartnerBillingIntentStatus,
    transactionSignature: row.transaction_signature ? String(row.transaction_signature) : null,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
  };
}

export async function createPartnerBillingIntent(input: {
  intentId: string;
  partnerId: string;
  applicationId: string;
  config: SolanaBillingConfig;
  payment: SolanaBillingPayment;
  expiresAt: string;
}): Promise<PartnerBillingIntent> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("partner_billing_intents").insert({
    intent_id: input.intentId,
    partner_id: input.partnerId,
    application_id: input.applicationId,
    plan_id: input.payment.planId,
    network_id: input.config.networkId,
    recipient: input.config.recipient.toBase58(),
    token_mint: input.config.tokenMint.toBase58(),
    amount_minor: input.payment.amountMinor,
    reference_pubkey: input.payment.reference,
    status: "pending",
    expires_at: input.expiresAt,
  }).select("*").single();
  if (error || !data) throw new Error("billing_store_unavailable");
  return mapIntent(data as Record<string, unknown>);
}

export async function getPartnerBillingIntent(input: {
  intentId: string;
  partnerId: string;
  applicationId: string;
}): Promise<PartnerBillingIntent | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("partner_billing_intents")
    .select("*")
    .eq("intent_id", input.intentId)
    .eq("partner_id", input.partnerId)
    .eq("application_id", input.applicationId)
    .maybeSingle();
  if (error) throw new Error("billing_store_unavailable");
  return data ? mapIntent(data as Record<string, unknown>) : null;
}

export async function getLatestPartnerBillingIntent(input: {
  partnerId: string;
  applicationId: string;
}): Promise<PartnerBillingIntent | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("partner_billing_intents")
    .select("*")
    .eq("partner_id", input.partnerId)
    .eq("application_id", input.applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("billing_store_unavailable");
  return data ? mapIntent(data as Record<string, unknown>) : null;
}

export async function expirePartnerBillingIntent(intentId: string, partnerId: string): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("partner_billing_intents")
    .update({ status: "expired" })
    .eq("intent_id", intentId)
    .eq("partner_id", partnerId)
    .eq("status", "pending");
  if (error) throw new Error("billing_store_unavailable");
}

export async function confirmPartnerBillingIntent(input: {
  intentId: string;
  partnerId: string;
  signature: string;
  confirmedAt: string;
}): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("confirm_partner_solana_billing_intent", {
    p_intent_id: input.intentId,
    p_partner_id: input.partnerId,
    p_transaction_signature: input.signature,
    p_confirmed_at: input.confirmedAt,
  });
  if (error) throw new Error("billing_store_unavailable");
  return data === true;
}

export function billingIntentView(intent: PartnerBillingIntent, paymentUrl?: string) {
  return {
    intent_id: intent.intentId,
    application_id: intent.applicationId,
    plan_id: intent.planId,
    network_id: intent.networkId,
    amount_minor: intent.amountMinor,
    amount: (intent.amountMinor / 1_000_000).toFixed(2),
    currency: "USDC",
    reference: intent.reference,
    status: intent.status,
    expires_at: intent.expiresAt,
    confirmed_at: intent.confirmedAt,
    transaction_signature: intent.transactionSignature,
    payment_url: paymentUrl,
    custody: false,
    production_access: false,
  } as const;
}
