// FILE: lib/partner/policyProposal/store.ts
// Durable partner policy proposals. Fail closed when the store is missing.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import {
  POLICY_PROPOSAL_NOTICE,
  POLICY_PROPOSAL_STATE_LABELS,
  type PolicyProposalState,
} from "./contract";
import {
  buildPlanningRecord,
  isOperatorProposalStatus,
  opaqueProposalRef,
  proposalLeaks,
  proposalPayloadHash,
  sanitizeOperatorRemediation,
  sanitizeProposalPayload,
  type SanitizedProposalPayload,
} from "./sanitize";

export interface PolicyProposalPublicItem {
  proposal_ref: string;
  status: PolicyProposalState;
  status_label: string;
  payload: SanitizedProposalPayload;
  remediation: string | null;
  notice: string;
  creates_policy: false;
  publishes_catalog: false;
  activates_mainnet: false;
  executes: false;
  replay?: boolean;
}

export interface PolicyProposalOperatorItem extends PolicyProposalPublicItem {
  id: string;
  partner_ref: string;
  planning: ReturnType<typeof buildPlanningRecord> | null;
  submitted_at: string | null;
}

const NONE = {
  creates_policy: false as const,
  publishes_catalog: false as const,
  activates_mainnet: false as const,
  executes: false as const,
  notice: POLICY_PROPOSAL_NOTICE,
};

async function storeReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from("partner_policy_proposals").select("id", { head: true, count: "exact" }).limit(0);
    return !error;
  } catch {
    return false;
  }
}

function partnerRef(partnerId: string): string {
  return opaqueProposalRef(`partner:${partnerId}`);
}

async function recordProposalActivity(input: {
  partnerId: string;
  eventType: "policy_proposal_submitted" | "policy_proposal_reviewed";
  proposalRef: string;
  lifecycle: string;
  replay?: boolean;
}): Promise<void> {
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_launchpad_applications")
      .select("id")
      .eq("partner_id", input.partnerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.id) return;
    await recordLaunchpadActivity(sb, {
      applicationId: data.id,
      partnerId: input.partnerId,
      eventType: input.eventType,
      publicCode: input.eventType,
      metadata: {
        proposal_ref: input.proposalRef,
        lifecycle: input.lifecycle,
        idempotency_replay: Boolean(input.replay),
        issues_production_key: false,
        activates_production: false,
      },
    });
  } catch {
    // History on the proposal row remains the durable audit trail.
  }
}

function toPublic(row: {
  id: string;
  status: string;
  payload: SanitizedProposalPayload;
  operator_note: string | null;
}): PolicyProposalPublicItem {
  return {
    proposal_ref: opaqueProposalRef(row.id),
    status: row.status as PolicyProposalState,
    status_label: POLICY_PROPOSAL_STATE_LABELS[row.status as PolicyProposalState],
    payload: row.payload,
    remediation: row.operator_note,
    ...NONE,
  };
}

export async function submitPolicyProposal(input: {
  partnerId: string;
  body: unknown;
  confirm: boolean;
}): Promise<{ ok: true; item: PolicyProposalPublicItem } | { ok: false; code: string }> {
  if (!input.confirm) return { ok: false, code: "confirmation_required" };
  const payload = sanitizeProposalPayload(input.body);
  if (!payload) return { ok: false, code: "invalid_input" };
  if (!(await storeReady())) return { ok: false, code: "policy_proposal_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const hash = proposalPayloadHash(payload);
    const { data: existing } = await sb
      .from("partner_policy_proposals")
      .select("id, status, payload, operator_note")
      .eq("partner_id", input.partnerId)
      .eq("payload_hash", hash)
      .in("status", ["submitted", "needs_information", "under_review", "accepted_for_policy_work"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const item = { ...toPublic(existing), replay: true };
      if (proposalLeaks(item).length > 0) return { ok: false, code: "policy_proposal_store_unavailable" };
      await recordProposalActivity({
        partnerId: input.partnerId,
        eventType: "policy_proposal_submitted",
        proposalRef: item.proposal_ref,
        lifecycle: item.status,
        replay: true,
      });
      return { ok: true, item };
    }
    const { data, error } = await sb
      .from("partner_policy_proposals")
      .insert({
        partner_id: input.partnerId,
        status: "submitted",
        payload,
        payload_hash: hash,
        history: [{ status: "submitted", at: new Date().toISOString() }],
        submitted_at: new Date().toISOString(),
      })
      .select("id, status, payload, operator_note")
      .single();
    if (error || !data) return { ok: false, code: "policy_proposal_store_unavailable" };
    const item = toPublic(data);
    if (proposalLeaks(item).length > 0) return { ok: false, code: "policy_proposal_store_unavailable" };
    await recordProposalActivity({
      partnerId: input.partnerId,
      eventType: "policy_proposal_submitted",
      proposalRef: item.proposal_ref,
      lifecycle: item.status,
    });
    return { ok: true, item };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) return { ok: false, code: "policy_proposal_store_unavailable" };
    return { ok: false, code: "policy_proposal_store_unavailable" };
  }
}

export async function listPartnerProposals(partnerId: string): Promise<{ ok: true; items: PolicyProposalPublicItem[] } | { ok: false; code: string }> {
  if (!(await storeReady())) return { ok: false, code: "policy_proposal_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_policy_proposals")
      .select("id, status, payload, operator_note")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { ok: false, code: "policy_proposal_store_unavailable" };
    const items = (data ?? []).map((row) => toPublic(row));
    if (items.some((item) => proposalLeaks(item).length > 0)) return { ok: false, code: "policy_proposal_store_unavailable" };
    return { ok: true, items };
  } catch {
    return { ok: false, code: "policy_proposal_store_unavailable" };
  }
}

export async function listOperatorProposals(): Promise<{ ok: true; items: PolicyProposalOperatorItem[] } | { ok: false; code: string }> {
  if (!(await storeReady())) return { ok: false, code: "policy_proposal_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_policy_proposals")
      .select("id, partner_id, status, payload, operator_note, planning, submitted_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false, code: "policy_proposal_store_unavailable" };
    const items = (data ?? []).map((row) => ({
      ...toPublic(row),
      id: row.id,
      partner_ref: partnerRef(row.partner_id),
      planning: row.planning ?? null,
      submitted_at: row.submitted_at,
    }));
    if (items.some((item) => proposalLeaks(item).length > 0)) return { ok: false, code: "policy_proposal_store_unavailable" };
    return { ok: true, items };
  } catch {
    return { ok: false, code: "policy_proposal_store_unavailable" };
  }
}

export async function getOperatorProposal(proposalId: string): Promise<{ ok: true; item: PolicyProposalOperatorItem } | { ok: false; code: string }> {
  if (!(await storeReady())) return { ok: false, code: "policy_proposal_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_policy_proposals")
      .select("id, partner_id, status, payload, operator_note, planning, submitted_at")
      .eq("id", proposalId)
      .maybeSingle();
    if (error) return { ok: false, code: "policy_proposal_store_unavailable" };
    if (!data) return { ok: false, code: "not_found" };
    const item: PolicyProposalOperatorItem = {
      ...toPublic(data),
      id: data.id,
      partner_ref: partnerRef(data.partner_id),
      planning: data.planning ?? null,
      submitted_at: data.submitted_at,
    };
    if (proposalLeaks(item).length > 0) return { ok: false, code: "policy_proposal_store_unavailable" };
    return { ok: true, item };
  } catch {
    return { ok: false, code: "policy_proposal_store_unavailable" };
  }
}

export async function decidePolicyProposal(input: {
  proposalId: string;
  body: unknown;
  confirm: boolean;
}): Promise<{ ok: true; item: PolicyProposalOperatorItem; replay: boolean } | { ok: false; code: string }> {
  if (!input.confirm) return { ok: false, code: "confirmation_required" };
  if (typeof input.body !== "object" || !input.body || Array.isArray(input.body)) return { ok: false, code: "invalid_input" };
  const record = input.body as Record<string, unknown>;
  if (!isOperatorProposalStatus(record.status)) return { ok: false, code: "invalid_input" };
  const remediation = sanitizeOperatorRemediation(record.remediation);
  if (!(await storeReady())) return { ok: false, code: "policy_proposal_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data: existing, error } = await sb
      .from("partner_policy_proposals")
      .select("id, partner_id, status, payload, operator_note, planning, submitted_at, history")
      .eq("id", input.proposalId)
      .maybeSingle();
    if (error) return { ok: false, code: "policy_proposal_store_unavailable" };
    if (!existing) return { ok: false, code: "not_found" };
    if (existing.status === record.status) {
      const item: PolicyProposalOperatorItem = {
        ...toPublic(existing),
        id: existing.id,
        partner_ref: partnerRef(existing.partner_id),
        planning: existing.planning ?? (existing.status === "accepted_for_policy_work" ? buildPlanningRecord(existing.payload) : null),
        submitted_at: existing.submitted_at,
      };
      if (proposalLeaks(item).length > 0) return { ok: false, code: "policy_proposal_store_unavailable" };
      await recordProposalActivity({
        partnerId: existing.partner_id,
        eventType: "policy_proposal_reviewed",
        proposalRef: item.proposal_ref,
        lifecycle: item.status,
        replay: true,
      });
      return { ok: true, item, replay: true };
    }
    const planning = record.status === "accepted_for_policy_work"
      ? buildPlanningRecord(existing.payload)
      : existing.planning;
    const history = Array.isArray(existing.history) ? existing.history : [];
    const { data, error: updateError } = await sb
      .from("partner_policy_proposals")
      .update({
        status: record.status,
        operator_note: remediation,
        planning,
        reviewed_at: new Date().toISOString(),
        history: [...history, { status: record.status, at: new Date().toISOString() }],
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.proposalId)
      .eq("partner_id", existing.partner_id)
      .select("id, partner_id, status, payload, operator_note, planning, submitted_at")
      .single();
    if (updateError || !data) return { ok: false, code: "policy_proposal_store_unavailable" };
    const item: PolicyProposalOperatorItem = {
      ...toPublic(data),
      id: data.id,
      partner_ref: partnerRef(data.partner_id),
      planning: data.planning ?? null,
      submitted_at: data.submitted_at,
    };
    if (proposalLeaks(item).length > 0) return { ok: false, code: "policy_proposal_store_unavailable" };
    await recordProposalActivity({
      partnerId: data.partner_id,
      eventType: "policy_proposal_reviewed",
      proposalRef: item.proposal_ref,
      lifecycle: item.status,
    });
    return { ok: true, item, replay: false };
  } catch {
    return { ok: false, code: "policy_proposal_store_unavailable" };
  }
}
