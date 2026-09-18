// FILE: lib/settlement/circle/store.ts
// Persist pending intents and Circle-authenticated evidence only. No raw payloads.

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isSettlementSchemaMissingError,
} from "@/lib/settlement/circle/availability";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import {
  CIRCLE_CURRENCY,
  CIRCLE_INFRASTRUCTURE_LABEL,
  CIRCLE_NETWORK,
  CIRCLE_SCHEMA_TABLE,
  CIRCLE_SETTLEMENT_ARTIFACT,
  CIRCLE_SETTLEMENT_LABEL,
  CIRCLE_SETTLEMENT_SCHEMA_VERSION,
  type CircleIntentState,
} from "@/lib/settlement/circle/constants";
import type { CircleSafeEvidence } from "@/lib/settlement/circle/evidence";

export interface SettlementIntentRow {
  id: string;
  application_id: string;
  partner_id: string;
  idempotency_key: string;
  state: CircleIntentState;
  network: typeof CIRCLE_NETWORK;
  currency: typeof CIRCLE_CURRENCY;
  amount_minor: number;
  receipt_id: string;
  policy_id: string;
  policy_version: number;
  provider_request_ref: string | null;
  circle_transaction_id: string | null;
  provider_state: string | null;
  provider_occurred_at: string | null;
  infrastructure_label: string;
  created_at: string;
  updated_at: string;
}

export function toSafeEvidence(row: SettlementIntentRow): CircleSafeEvidence {
  return {
    artifact: CIRCLE_SETTLEMENT_ARTIFACT,
    schema_version: CIRCLE_SETTLEMENT_SCHEMA_VERSION,
    environment: "sandbox",
    label: CIRCLE_SETTLEMENT_LABEL,
    infrastructure_label: CIRCLE_INFRASTRUCTURE_LABEL,
    not_a_custodian: true,
    intent_is_not_a_payment: true,
    activates_production: false,
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amount_minor: row.amount_minor,
    state: row.state,
    provider_request_ref: row.provider_request_ref,
    circle_transaction_id: row.circle_transaction_id,
    provider_state: row.provider_state,
    provider_occurred_at: row.provider_occurred_at,
    receipt_id: row.receipt_id,
    policy_id: row.policy_id,
    policy_version: row.policy_version,
    idempotency_key: row.idempotency_key,
    last_updated_at: row.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  const rec = error && typeof error === "object" ? error as { code?: string; message?: string } : {};
  return rec.code === "23505" || String(rec.message ?? "").toLowerCase().includes("duplicate");
}

export async function insertPendingIntent(input: {
  applicationId: string;
  partnerId: string;
  idempotencyKey: string;
  amountMinor: number;
  receiptId: string;
  policyId: string;
  policyVersion: number;
  client?: SupabaseClient;
}): Promise<{ ok: true; row: SettlementIntentRow; duplicate: boolean } | { ok: false; code: string }> {
  const sb = input.client ?? requireSupabaseAdmin();
  const payload = {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    idempotency_key: input.idempotencyKey,
    state: "pending" as const,
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amount_minor: input.amountMinor,
    receipt_id: input.receiptId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    infrastructure_label: CIRCLE_INFRASTRUCTURE_LABEL,
  };
  const { data, error } = await sb
    .from(CIRCLE_SCHEMA_TABLE)
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (!error && data) {
    return { ok: true, row: data as SettlementIntentRow, duplicate: false };
  }
  if (error && isSettlementSchemaMissingError(error)) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.schema_unavailable };
  }
  if (error && isUniqueViolation(error)) {
    const existing = await findIntentByIdempotency({
      applicationId: input.applicationId,
      partnerId: input.partnerId,
      idempotencyKey: input.idempotencyKey,
      client: sb,
    }) ?? await findIntentByReceipt({
      applicationId: input.applicationId,
      partnerId: input.partnerId,
      receiptId: input.receiptId,
      client: sb,
    });
    if (existing) return { ok: true, row: existing, duplicate: true };
    return { ok: false, code: CIRCLE_PUBLIC_CODES.duplicate };
  }
  return { ok: false, code: CIRCLE_PUBLIC_CODES.schema_unavailable };
}

export async function findIntentByIdempotency(input: {
  applicationId: string;
  partnerId: string;
  idempotencyKey: string;
  client?: SupabaseClient;
}): Promise<SettlementIntentRow | null> {
  const sb = input.client ?? requireSupabaseAdmin();
  const { data, error } = await sb
    .from(CIRCLE_SCHEMA_TABLE)
    .select("*")
    .eq("application_id", input.applicationId)
    .eq("partner_id", input.partnerId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (error || !data) return null;
  return data as SettlementIntentRow;
}

export async function findIntentByReceipt(input: {
  applicationId: string;
  partnerId: string;
  receiptId: string;
  client?: SupabaseClient;
}): Promise<SettlementIntentRow | null> {
  const sb = input.client ?? requireSupabaseAdmin();
  const { data, error } = await sb
    .from(CIRCLE_SCHEMA_TABLE)
    .select("*")
    .eq("application_id", input.applicationId)
    .eq("partner_id", input.partnerId)
    .eq("receipt_id", input.receiptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as SettlementIntentRow;
}

export async function listIntentsForApplication(input: {
  applicationId: string;
  partnerId: string;
  client?: SupabaseClient;
}): Promise<SettlementIntentRow[]> {
  const sb = input.client ?? requireSupabaseAdmin();
  const { data, error } = await sb
    .from(CIRCLE_SCHEMA_TABLE)
    .select("*")
    .eq("application_id", input.applicationId)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data as SettlementIntentRow[];
}

export async function applyAuthenticatedEvidence(input: {
  intent: SettlementIntentRow;
  state: CircleIntentState;
  providerRequestRef: string;
  circleTransactionId: string | null;
  providerState: string;
  occurredAt: string;
  client?: SupabaseClient;
}): Promise<SettlementIntentRow | null> {
  if (input.intent.state === "settled") return input.intent;
  const sb = input.client ?? requireSupabaseAdmin();
  const { data, error } = await sb
    .from(CIRCLE_SCHEMA_TABLE)
    .update({
      state: input.state,
      provider_request_ref: input.providerRequestRef,
      circle_transaction_id: input.circleTransactionId,
      provider_state: input.providerState,
      provider_occurred_at: input.occurredAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.intent.id)
    .eq("partner_id", input.intent.partner_id)
    .neq("state", "settled")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as SettlementIntentRow;
}
