// FILE: lib/partner/valueEvidence/store.ts
// Operator commercial/ICP/feature-request persistence. Service role only.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export type DesignPartnerStatus = "prospect" | "design_partner" | "paused" | "declined" | "not_converted";
export type CommercialModelCandidate =
  | "platform_fee_plus_usage"
  | "annual_contract_plus_usage"
  | "usage_only"
  | "pilot_free"
  | "pilot_paid"
  | "custom_evaluation"
  | "undecided";
export type FeatureRequestClassification =
  | "core_platform"
  | "reusable_policy_capability"
  | "partner_configuration"
  | "custom_one_off"
  | "security_requirement"
  | "compliance_requirement";

export interface CommercialStateRow {
  application_id: string;
  partner_id: string;
  design_partner_status: DesignPartnerStatus;
  commercial_lifecycle_stage: "none" | "commercial_review" | "converted";
  commercial_model_candidate: CommercialModelCandidate | null;
  commercial_model_status: "evaluating" | "selected" | "rejected" | "undecided" | null;
  commercial_converted: boolean;
  commercial_declined: boolean;
  commercial_paused: boolean;
  effective_from: string | null;
  operator_actor: string | null;
  operator_note_reference: string | null;
  updated_at: string;
}

export interface IcpProfileRow {
  application_id: string;
  partner_id: string;
  industry_category: string | null;
  company_size_band: "startup" | "growth" | "enterprise" | "unknown" | null;
  primary_policy_need: string | null;
  integration_type: "hosted_partner_flow" | "server_verify" | "webhook" | "onchain_gate" | "other" | null;
  initial_use_case: string | null;
  technical_owner_type: "engineering" | "product" | "compliance" | "founder" | "other" | null;
  compliance_driver: "age_gate" | "residency" | "privacy" | "regulatory" | "other" | "none" | null;
}

export interface FeatureRequestRow {
  id: string;
  partner_id: string;
  application_id: string | null;
  title: string;
  classification: FeatureRequestClassification;
  reusable_across_market: "yes" | "no" | "unknown";
  blocks_production: boolean;
  status: "open" | "accepted" | "deferred" | "rejected" | "shipped";
  requested_by_partner: string;
}

const commercialMemory = new Map<string, CommercialStateRow>();
const icpMemory = new Map<string, IcpProfileRow>();
const featureMemory: FeatureRequestRow[] = [];
const auditMemory: Array<{ partner_id: string; application_id: string | null; event_type: string; public_code: string | null; operator_actor: string | null; created_at: string }> = [];

export function resetValueEvidenceStoreForTests(): void {
  commercialMemory.clear();
  icpMemory.clear();
  featureMemory.length = 0;
  auditMemory.length = 0;
}

export function seedCommercialStateForTests(row: CommercialStateRow): void {
  commercialMemory.set(row.application_id, row);
}

export function seedFeatureRequestForTests(row: FeatureRequestRow): void {
  featureMemory.push(row);
}

export async function loadCommercialState(applicationId: string): Promise<CommercialStateRow | null> {
  if (process.env.VITEST) return commercialMemory.get(applicationId) ?? null;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_value_commercial_state").select("*").eq("application_id", applicationId).maybeSingle();
    return (data as CommercialStateRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function loadIcpProfile(applicationId: string): Promise<IcpProfileRow | null> {
  if (process.env.VITEST) return icpMemory.get(applicationId) ?? null;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_value_icp_profile").select("*").eq("application_id", applicationId).maybeSingle();
    return (data as IcpProfileRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function listFeatureRequests(partnerId: string): Promise<FeatureRequestRow[]> {
  if (process.env.VITEST) return featureMemory.filter((row) => row.partner_id === partnerId);
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_value_feature_requests").select("*").eq("partner_id", partnerId);
    return (data as FeatureRequestRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function recordValueOperatorAudit(input: {
  partnerId: string;
  applicationId?: string | null;
  eventType: string;
  publicCode?: string | null;
  operatorActor?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const row = {
    partner_id: input.partnerId,
    application_id: input.applicationId ?? null,
    event_type: input.eventType,
    public_code: input.publicCode ?? null,
    operator_actor: input.operatorActor ?? null,
    created_at: new Date().toISOString(),
  };
  auditMemory.unshift(row);
  if (process.env.VITEST) return;
  try {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_value_operator_audit").insert({
      partner_id: input.partnerId,
      application_id: input.applicationId ?? null,
      event_type: input.eventType,
      public_code: input.publicCode ?? null,
      operator_actor: input.operatorActor ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit failure must not block operator workflows — mirrors control-plane semantics.
  }
}

export function validateCommercialStatePatch(input: {
  patch: Partial<Omit<CommercialStateRow, "application_id" | "partner_id" | "updated_at">>;
  productionActivatedAt: string | null;
}): { ok: true } | { ok: false; code: string } {
  if (input.patch.commercial_converted && !input.productionActivatedAt) {
    return { ok: false, code: "commercial_converted_requires_production_active" };
  }
  if (input.patch.commercial_lifecycle_stage === "converted" && !input.productionActivatedAt) {
    return { ok: false, code: "commercial_converted_requires_production_active" };
  }
  return { ok: true };
}

export async function upsertCommercialState(input: {
  applicationId: string;
  partnerId: string;
  patch: Partial<Omit<CommercialStateRow, "application_id" | "partner_id" | "updated_at">>;
  operatorActor: string;
  productionActivatedAt?: string | null;
}): Promise<CommercialStateRow> {
  const validation = validateCommercialStatePatch({
    patch: input.patch,
    productionActivatedAt: input.productionActivatedAt ?? null,
  });
  if (!validation.ok) {
    throw new Error(validation.code);
  }
  const existing = await loadCommercialState(input.applicationId);
  const next: CommercialStateRow = {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    design_partner_status: input.patch.design_partner_status ?? existing?.design_partner_status ?? "prospect",
    commercial_lifecycle_stage: input.patch.commercial_lifecycle_stage ?? existing?.commercial_lifecycle_stage ?? "none",
    commercial_model_candidate: input.patch.commercial_model_candidate ?? existing?.commercial_model_candidate ?? null,
    commercial_model_status: input.patch.commercial_model_status ?? existing?.commercial_model_status ?? null,
    commercial_converted: input.patch.commercial_converted ?? existing?.commercial_converted ?? false,
    commercial_declined: input.patch.commercial_declined ?? existing?.commercial_declined ?? false,
    commercial_paused: input.patch.commercial_paused ?? existing?.commercial_paused ?? false,
    effective_from: input.patch.effective_from ?? existing?.effective_from ?? null,
    operator_actor: input.operatorActor,
    operator_note_reference: input.patch.operator_note_reference ?? existing?.operator_note_reference ?? null,
    updated_at: new Date().toISOString(),
  };
  commercialMemory.set(input.applicationId, next);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_value_commercial_state").upsert(next);
  }
  const eventType = input.patch.design_partner_status && input.patch.design_partner_status !== existing?.design_partner_status
    ? "design_partner_status_changed"
    : input.patch.commercial_model_candidate && input.patch.commercial_model_candidate !== existing?.commercial_model_candidate
      ? "commercial_model_candidate_changed"
      : "commercial_stage_changed";
  await recordValueOperatorAudit({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    eventType,
    publicCode: next.commercial_lifecycle_stage,
    operatorActor: input.operatorActor,
  });
  return next;
}

export async function upsertIcpProfile(input: {
  applicationId: string;
  partnerId: string;
  patch: Partial<Omit<IcpProfileRow, "application_id" | "partner_id">>;
  operatorActor: string;
}): Promise<IcpProfileRow> {
  const existing = await loadIcpProfile(input.applicationId);
  const next: IcpProfileRow = {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    industry_category: input.patch.industry_category ?? existing?.industry_category ?? null,
    company_size_band: input.patch.company_size_band ?? existing?.company_size_band ?? null,
    primary_policy_need: input.patch.primary_policy_need ?? existing?.primary_policy_need ?? null,
    integration_type: input.patch.integration_type ?? existing?.integration_type ?? null,
    initial_use_case: input.patch.initial_use_case ?? existing?.initial_use_case ?? null,
    technical_owner_type: input.patch.technical_owner_type ?? existing?.technical_owner_type ?? null,
    compliance_driver: input.patch.compliance_driver ?? existing?.compliance_driver ?? null,
  };
  icpMemory.set(input.applicationId, next);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_value_icp_profile").upsert({ ...next, operator_actor: input.operatorActor });
  }
  return next;
}

export async function insertFeatureRequest(input: {
  partnerId: string;
  applicationId?: string | null;
  title: string;
  classification: FeatureRequestClassification;
  reusableAcrossMarket: FeatureRequestRow["reusable_across_market"];
  blocksProduction: boolean;
  requestedByPartner: string;
  operatorActor: string;
}): Promise<FeatureRequestRow> {
  const row: FeatureRequestRow = {
    id: crypto.randomUUID(),
    partner_id: input.partnerId,
    application_id: input.applicationId ?? null,
    title: input.title,
    classification: input.classification,
    reusable_across_market: input.reusableAcrossMarket,
    blocks_production: input.blocksProduction,
    status: "open",
    requested_by_partner: input.requestedByPartner,
  };
  featureMemory.push(row);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_value_feature_requests").insert({
      id: row.id,
      partner_id: row.partner_id,
      application_id: row.application_id,
      title: row.title,
      classification: row.classification,
      reusable_across_market: row.reusable_across_market,
      blocks_production: row.blocks_production,
      status: row.status,
      requested_by_partner: row.requested_by_partner,
      operator_actor: input.operatorActor,
    });
  }
  await recordValueOperatorAudit({
    partnerId: input.partnerId,
    applicationId: input.applicationId ?? null,
    eventType: "feature_request_classified",
    publicCode: row.classification,
    operatorActor: input.operatorActor,
  });
  return row;
}
