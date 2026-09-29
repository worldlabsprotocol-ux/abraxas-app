// FILE: lib/partner/designPartnerProgram/store.ts
// Design Partner Program persistence — service role only.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordValueOperatorAudit } from "@/lib/partner/valueEvidence/store";
import type {
  CriterionType,
  DesignPartnerProgramRow,
  DecisionOutcome,
  PermissionStatus,
  ProgramStatus,
  TechnicalOutcome,
} from "./contract";

export interface CriteriaRow {
  id: string;
  application_id: string;
  partner_id: string;
  criterion_type: CriterionType;
  target: Record<string, unknown>;
  measurement_source: string;
  operator_confirmed: boolean;
  operator_confirmed_at: string | null;
  created_at: string;
}

export interface CaseStudyPermissionsRow {
  application_id: string;
  partner_id: string;
  company_name_permission: PermissionStatus;
  quote_permission: PermissionStatus;
  metrics_permission: PermissionStatus;
  logo_permission: PermissionStatus;
  public_case_study_permission: PermissionStatus;
  updated_at: string;
}

export interface CustomerReportedEvidenceRow {
  id: string;
  application_id: string;
  partner_id: string;
  evidence_type: string;
  safe_value: string;
  source_date: string | null;
  permission_status: PermissionStatus;
  safe_source_reference: string | null;
  created_at: string;
}

const programMemory = new Map<string, DesignPartnerProgramRow>();
const criteriaMemory = new Map<string, CriteriaRow[]>();
const permissionsMemory = new Map<string, CaseStudyPermissionsRow>();
const customerEvidenceMemory = new Map<string, CustomerReportedEvidenceRow[]>();

export function resetDesignPartnerStoreForTests(): void {
  programMemory.clear();
  criteriaMemory.clear();
  permissionsMemory.clear();
  customerEvidenceMemory.clear();
}

export function seedProgramForTests(row: DesignPartnerProgramRow): void {
  programMemory.set(row.application_id, row);
}

export function seedCriteriaForTests(rows: CriteriaRow[]): void {
  if (rows.length === 0) return;
  criteriaMemory.set(rows[0]!.application_id, rows);
}

export async function loadProgram(applicationId: string): Promise<DesignPartnerProgramRow | null> {
  if (process.env.VITEST) return programMemory.get(applicationId) ?? null;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_design_partner_program").select("*").eq("application_id", applicationId).maybeSingle();
    return (data as DesignPartnerProgramRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function listPrograms(partnerId?: string): Promise<DesignPartnerProgramRow[]> {
  if (process.env.VITEST) {
    const rows = Array.from(programMemory.values());
    return partnerId ? rows.filter((r) => r.partner_id === partnerId) : rows;
  }
  try {
    const sb = requireSupabaseAdmin();
    let query = sb.from("partner_design_partner_program").select("*").order("entered_at", { ascending: true });
    if (partnerId) query = query.eq("partner_id", partnerId);
    const { data } = await query;
    return (data as DesignPartnerProgramRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function listCriteria(applicationId: string): Promise<CriteriaRow[]> {
  if (process.env.VITEST) return criteriaMemory.get(applicationId) ?? [];
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_design_partner_criteria").select("*").eq("application_id", applicationId);
    return (data as CriteriaRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function loadCaseStudyPermissions(applicationId: string): Promise<CaseStudyPermissionsRow | null> {
  if (process.env.VITEST) return permissionsMemory.get(applicationId) ?? null;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_case_study_permissions").select("*").eq("application_id", applicationId).maybeSingle();
    return (data as CaseStudyPermissionsRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function listCustomerReportedEvidence(applicationId: string): Promise<CustomerReportedEvidenceRow[]> {
  if (process.env.VITEST) return customerEvidenceMemory.get(applicationId) ?? [];
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partner_customer_reported_evidence").select("*").eq("application_id", applicationId);
    return (data as CustomerReportedEvidenceRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function enrollProgram(input: {
  applicationId: string;
  partnerId: string;
  primaryUseCase?: string | null;
  initialPolicyPack?: string | null;
  pilotEnvironment?: "sandbox" | "production";
  targetDecisionDate?: string | null;
  operatorActor: string;
}): Promise<DesignPartnerProgramRow> {
  const now = new Date().toISOString();
  const row: DesignPartnerProgramRow = {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    program_status: "candidate",
    entered_at: now,
    target_decision_date: input.targetDecisionDate ?? null,
    primary_use_case: input.primaryUseCase ?? null,
    initial_policy_pack: input.initialPolicyPack ?? null,
    pilot_environment: input.pilotEnvironment ?? "sandbox",
    technical_owner_status: null,
    business_owner_status: null,
    pilot_started_at: null,
    pilot_completed_at: null,
    decision_status: "pending",
    decision_reason_codes: [],
    decision_operator_summary: null,
    decision_recorded_at: null,
    technical_outcome: null,
    updated_at: now,
  };
  programMemory.set(input.applicationId, row);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_design_partner_program").insert({ ...row, operator_actor: input.operatorActor });
  }
  await recordValueOperatorAudit({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    eventType: "design_partner_enrolled",
    publicCode: "candidate",
    operatorActor: input.operatorActor,
  });
  return row;
}

export async function updateProgram(input: {
  applicationId: string;
  partnerId: string;
  patch: Partial<Omit<DesignPartnerProgramRow, "application_id" | "partner_id">>;
  operatorActor: string;
  auditEvent?: string;
}): Promise<DesignPartnerProgramRow> {
  const existing = await loadProgram(input.applicationId);
  if (!existing) throw new Error("program_not_found");
  const next: DesignPartnerProgramRow = {
    ...existing,
    ...input.patch,
    application_id: existing.application_id,
    partner_id: existing.partner_id,
    updated_at: new Date().toISOString(),
  };
  programMemory.set(input.applicationId, next);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_design_partner_program").update({ ...next, operator_actor: input.operatorActor }).eq("application_id", input.applicationId);
  }
  if (input.auditEvent) {
    await recordValueOperatorAudit({
      partnerId: input.partnerId,
      applicationId: input.applicationId,
      eventType: input.auditEvent,
      publicCode: next.program_status,
      operatorActor: input.operatorActor,
    });
  }
  return next;
}

export async function createCriteria(input: {
  applicationId: string;
  partnerId: string;
  criterionType: CriterionType;
  target: Record<string, unknown>;
  measurementSource: string;
  operatorActor: string;
}): Promise<CriteriaRow> {
  const row: CriteriaRow = {
    id: crypto.randomUUID(),
    application_id: input.applicationId,
    partner_id: input.partnerId,
    criterion_type: input.criterionType,
    target: input.target,
    measurement_source: input.measurementSource,
    operator_confirmed: false,
    operator_confirmed_at: null,
    created_at: new Date().toISOString(),
  };
  const list = criteriaMemory.get(input.applicationId) ?? [];
  list.push(row);
  criteriaMemory.set(input.applicationId, list);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_design_partner_criteria").insert(row);
  }
  await recordValueOperatorAudit({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    eventType: "pilot_criteria_created",
    publicCode: input.criterionType,
    operatorActor: input.operatorActor,
  });
  return row;
}

export async function recordDecision(input: {
  applicationId: string;
  partnerId: string;
  decisionStatus: DecisionOutcome;
  reasonCodes: string[];
  operatorSummary?: string | null;
  technicalOutcome?: TechnicalOutcome | null;
  operatorActor: string;
  productionActivatedAt?: string | null;
}): Promise<DesignPartnerProgramRow> {
  if (input.decisionStatus === "converted" && !input.productionActivatedAt) {
    throw new Error("converted_requires_production_active");
  }
  const now = new Date().toISOString();
  const patch: Partial<Omit<DesignPartnerProgramRow, "application_id" | "partner_id">> = {
    decision_status: input.decisionStatus,
    decision_reason_codes: input.reasonCodes,
    decision_operator_summary: input.operatorSummary ?? null,
    decision_recorded_at: now,
    technical_outcome: input.technicalOutcome ?? null,
  };
  if (input.decisionStatus === "converted") patch.program_status = "converted";
  if (input.decisionStatus === "not_converted") patch.program_status = "not_converted";
  if (input.decisionStatus === "paused") patch.program_status = "paused";

  return updateProgram({
    applicationId: input.applicationId,
    partnerId: input.partnerId,
    patch,
    operatorActor: input.operatorActor,
    auditEvent: "commercial_decision_recorded",
  });
}

export async function upsertCaseStudyPermissions(input: {
  applicationId: string;
  partnerId: string;
  patch: Partial<Omit<CaseStudyPermissionsRow, "application_id" | "partner_id" | "updated_at">>;
  operatorActor: string;
}): Promise<CaseStudyPermissionsRow> {
  const existing = await loadCaseStudyPermissions(input.applicationId);
  const next: CaseStudyPermissionsRow = {
    application_id: input.applicationId,
    partner_id: input.partnerId,
    company_name_permission: input.patch.company_name_permission ?? existing?.company_name_permission ?? "pending",
    quote_permission: input.patch.quote_permission ?? existing?.quote_permission ?? "pending",
    metrics_permission: input.patch.metrics_permission ?? existing?.metrics_permission ?? "pending",
    logo_permission: input.patch.logo_permission ?? existing?.logo_permission ?? "pending",
    public_case_study_permission: input.patch.public_case_study_permission ?? existing?.public_case_study_permission ?? "pending",
    updated_at: new Date().toISOString(),
  };
  permissionsMemory.set(input.applicationId, next);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_case_study_permissions").upsert({ ...next, operator_actor: input.operatorActor });
  }
  await recordValueOperatorAudit({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    eventType: "case_study_permission_changed",
    operatorActor: input.operatorActor,
  });
  return next;
}

export async function addCustomerReportedEvidence(input: {
  applicationId: string;
  partnerId: string;
  evidenceType: string;
  safeValue: string;
  sourceDate?: string | null;
  permissionStatus?: PermissionStatus;
  safeSourceReference?: string | null;
  operatorActor: string;
}): Promise<CustomerReportedEvidenceRow> {
  const row: CustomerReportedEvidenceRow = {
    id: crypto.randomUUID(),
    application_id: input.applicationId,
    partner_id: input.partnerId,
    evidence_type: input.evidenceType,
    safe_value: input.safeValue,
    source_date: input.sourceDate ?? null,
    permission_status: input.permissionStatus ?? "pending",
    safe_source_reference: input.safeSourceReference ?? null,
    created_at: new Date().toISOString(),
  };
  const list = customerEvidenceMemory.get(input.applicationId) ?? [];
  list.push(row);
  customerEvidenceMemory.set(input.applicationId, list);
  if (!process.env.VITEST) {
    const sb = requireSupabaseAdmin();
    await sb.from("partner_customer_reported_evidence").insert({ ...row, operator_actor: input.operatorActor });
  }
  await recordValueOperatorAudit({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    eventType: "customer_reported_evidence_added",
    publicCode: input.evidenceType,
    operatorActor: input.operatorActor,
  });
  return row;
}
