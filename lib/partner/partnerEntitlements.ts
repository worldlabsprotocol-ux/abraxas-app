// FILE: lib/partner/partnerEntitlements.ts
// Observe-only entitlements foundation — no partner blocked by default.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PartnerEnforcementMode = "observe" | "enforce";

export interface PartnerEntitlements {
  partnerId: string;
  planId: string;
  monthlyReceiptLimit: number | null;
  monthlyApiCallLimit: number | null;
  enforcementMode: PartnerEnforcementMode;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PartnerEntitlementEvaluation {
  partnerId: string;
  enforcementMode: PartnerEnforcementMode;
  observeOnly: boolean;
  enforcementEnabled: boolean;
  wouldBlock: boolean;
  reason: string | null;
  monthlyReceiptLimit: number | null;
  monthlyApiCallLimit: number | null;
  currentReceiptCount: number | null;
  currentApiCallCount: number | null;
}

const DEFAULT_ENTITLEMENTS: Omit<PartnerEntitlements, "partnerId"> = {
  planId: "observe",
  monthlyReceiptLimit: null,
  monthlyApiCallLimit: null,
  enforcementMode: "observe",
  updatedAt: null,
  updatedBy: null,
};

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function defaultPartnerEntitlements(partnerId: string): PartnerEntitlements {
  return { partnerId, ...DEFAULT_ENTITLEMENTS };
}

export async function getPartnerEntitlements(partnerId: string): Promise<PartnerEntitlements> {
  const client = sb();
  if (!client) return defaultPartnerEntitlements(partnerId);

  const { data, error } = await client
    .from("partner_entitlements")
    .select("partner_id, plan_id, monthly_receipt_limit, monthly_api_call_limit, enforcement_mode, updated_at, updated_by")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error || !data) return defaultPartnerEntitlements(partnerId);

  return {
    partnerId: data.partner_id,
    planId: data.plan_id ?? "observe",
    monthlyReceiptLimit: data.monthly_receipt_limit ?? null,
    monthlyApiCallLimit: data.monthly_api_call_limit ?? null,
    enforcementMode: (data.enforcement_mode ?? "observe") as PartnerEnforcementMode,
    updatedAt: data.updated_at ?? null,
    updatedBy: data.updated_by ?? null,
  };
}

export async function upsertPartnerEntitlements(input: {
  partnerId: string;
  planId?: string;
  monthlyReceiptLimit?: number | null;
  monthlyApiCallLimit?: number | null;
  enforcementMode?: PartnerEnforcementMode;
  updatedBy: string;
}): Promise<PartnerEntitlements | null> {
  const client = sb();
  if (!client) return null;

  const payload = {
    partner_id: input.partnerId,
    plan_id: input.planId ?? "observe",
    monthly_receipt_limit: input.monthlyReceiptLimit ?? null,
    monthly_api_call_limit: input.monthlyApiCallLimit ?? null,
    enforcement_mode: input.enforcementMode ?? "observe",
    updated_at: new Date().toISOString(),
    updated_by: input.updatedBy,
  };

  const { data, error } = await client
    .from("partner_entitlements")
    .upsert(payload, { onConflict: "partner_id" })
    .select("partner_id, plan_id, monthly_receipt_limit, monthly_api_call_limit, enforcement_mode, updated_at, updated_by")
    .single();

  if (error || !data) return null;

  return {
    partnerId: data.partner_id,
    planId: data.plan_id,
    monthlyReceiptLimit: data.monthly_receipt_limit,
    monthlyApiCallLimit: data.monthly_api_call_limit,
    enforcementMode: data.enforcement_mode as PartnerEnforcementMode,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
}

export async function evaluatePartnerEntitlements(input: {
  partnerId: string;
  currentReceiptCount?: number;
  currentApiCallCount?: number;
}): Promise<PartnerEntitlementEvaluation> {
  const entitlements = await getPartnerEntitlements(input.partnerId);

  return {
    partnerId: input.partnerId,
    enforcementMode: "observe",
    observeOnly: true,
    enforcementEnabled: false,
    wouldBlock: false,
    reason: null,
    monthlyReceiptLimit: entitlements.monthlyReceiptLimit,
    monthlyApiCallLimit: entitlements.monthlyApiCallLimit,
    currentReceiptCount: input.currentReceiptCount ?? null,
    currentApiCallCount: input.currentApiCallCount ?? null,
  };
}
