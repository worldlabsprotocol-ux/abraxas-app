// FILE: lib/partner/policyReleaseCandidate/store.ts
// Durable policy release candidates. Fail closed. Never publishes catalog.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { opaqueProposalRef } from "@/lib/partner/policyProposal/sanitize";
import type { SanitizedProposalPayload } from "@/lib/partner/policyProposal/sanitize";
import {
  POLICY_RC_NOTICE,
  POLICY_RC_STATE_LABELS,
  policyRcCanTransition,
  type PolicyRcState,
} from "./contract";
import {
  deriveReleaseShape,
  isOperatorRcStatus,
  opaqueCandidateRef,
  releaseLeaks,
  releaseShapeHash,
  sanitizeOperatorRemediation,
  type SanitizedReleaseShape,
} from "./sanitize";
import { buildReleaseSpecification } from "./spec";
import { generateReleaseFixtures } from "./fixtures";
import { planIssuersForReleaseShape, type IssuerMethodPlan } from "@/lib/verification/issuerTrust";

export interface PolicyRcOperatorItem {
  id: string;
  candidate_ref: string;
  proposal_ref: string;
  partner_ref: string;
  status: PolicyRcState;
  status_label: string;
  shape: SanitizedReleaseShape;
  spec: ReturnType<typeof buildReleaseSpecification>;
  fixtures: ReturnType<typeof generateReleaseFixtures>;
  issuer_plan: IssuerMethodPlan;
  remediation: string | null;
  notice: string;
  creates_policy: false;
  publishes_catalog: false;
  activates_mainnet: false;
  executes: false;
  mints_receipt: false;
  replay?: boolean;
}

const NONE = {
  creates_policy: false as const,
  publishes_catalog: false as const,
  activates_mainnet: false as const,
  executes: false as const,
  mints_receipt: false as const,
  notice: POLICY_RC_NOTICE,
};

async function storeReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from("partner_policy_release_candidates").select("id", { head: true, count: "exact" }).limit(0);
    return !error;
  } catch {
    return false;
  }
}

function partnerRef(partnerId: string): string {
  return opaqueProposalRef(`partner:${partnerId}`);
}

function toItem(row: {
  id: string;
  proposal_id: string;
  partner_id: string;
  status: string;
  shape: SanitizedReleaseShape;
  operator_note: string | null;
}): PolicyRcOperatorItem {
  return {
    id: row.id,
    candidate_ref: opaqueCandidateRef(row.id),
    proposal_ref: opaqueProposalRef(row.proposal_id),
    partner_ref: partnerRef(row.partner_id),
    status: row.status as PolicyRcState,
    status_label: POLICY_RC_STATE_LABELS[row.status as PolicyRcState],
    shape: row.shape,
    spec: buildReleaseSpecification(row.shape),
    fixtures: generateReleaseFixtures(row.shape),
    issuer_plan: planIssuersForReleaseShape(row.shape),
    remediation: row.operator_note,
    ...NONE,
  };
}

async function recordRcActivity(input: {
  partnerId: string;
  eventType: "policy_release_candidate_created" | "policy_release_candidate_reviewed";
  candidateRef: string;
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
        candidate_ref: input.candidateRef,
        proposal_ref: input.proposalRef,
        lifecycle: input.lifecycle,
        idempotency_replay: Boolean(input.replay),
        issues_production_key: false,
        activates_production: false,
      },
    });
  } catch {
    // Candidate history remains the durable audit trail.
  }
}

export async function createReleaseCandidate(input: {
  proposalId: string;
  body: unknown;
  confirm: boolean;
}): Promise<{ ok: true; item: PolicyRcOperatorItem } | { ok: false; code: string }> {
  if (!input.confirm) return { ok: false, code: "confirmation_required" };
  if (!(await storeReady())) return { ok: false, code: "policy_release_candidate_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data: proposal, error } = await sb
      .from("partner_policy_proposals")
      .select("id, partner_id, status, payload")
      .eq("id", input.proposalId)
      .maybeSingle();
    if (error) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    if (!proposal) return { ok: false, code: "not_found" };
    if (proposal.status !== "accepted_for_policy_work") return { ok: false, code: "accepted_proposal_required" };
    const shape = deriveReleaseShape(proposal.payload as SanitizedProposalPayload, input.body);
    if (!shape) return { ok: false, code: "invalid_input" };
    const hash = releaseShapeHash(shape);
    const { data: existing } = await sb
      .from("partner_policy_release_candidates")
      .select("id, proposal_id, partner_id, status, shape, operator_note")
      .eq("proposal_id", proposal.id)
      .eq("shape_hash", hash)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const item = { ...toItem(existing), replay: true };
      if (releaseLeaks(item).length > 0) return { ok: false, code: "policy_release_candidate_store_unavailable" };
      await recordRcActivity({
        partnerId: proposal.partner_id,
        eventType: "policy_release_candidate_created",
        candidateRef: item.candidate_ref,
        proposalRef: item.proposal_ref,
        lifecycle: item.status,
        replay: true,
      });
      return { ok: true, item };
    }
    const { data, error: insertError } = await sb
      .from("partner_policy_release_candidates")
      .insert({
        proposal_id: proposal.id,
        partner_id: proposal.partner_id,
        status: "draft",
        shape,
        shape_hash: hash,
        history: [{ status: "draft", at: new Date().toISOString() }],
      })
      .select("id, proposal_id, partner_id, status, shape, operator_note")
      .single();
    if (insertError || !data) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    const item = toItem(data);
    if (releaseLeaks(item).length > 0) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    await recordRcActivity({
      partnerId: proposal.partner_id,
      eventType: "policy_release_candidate_created",
      candidateRef: item.candidate_ref,
      proposalRef: item.proposal_ref,
      lifecycle: item.status,
    });
    return { ok: true, item };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    return { ok: false, code: "policy_release_candidate_store_unavailable" };
  }
}

export async function listReleaseCandidates(): Promise<{ ok: true; items: PolicyRcOperatorItem[] } | { ok: false; code: string }> {
  if (!(await storeReady())) return { ok: false, code: "policy_release_candidate_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_policy_release_candidates")
      .select("id, proposal_id, partner_id, status, shape, operator_note")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    const items = (data ?? []).map((row) => toItem(row));
    if (items.some((item) => releaseLeaks(item).length > 0)) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    return { ok: true, items };
  } catch {
    return { ok: false, code: "policy_release_candidate_store_unavailable" };
  }
}

export async function decideReleaseCandidate(input: {
  candidateId: string;
  body: unknown;
  confirm: boolean;
}): Promise<{ ok: true; item: PolicyRcOperatorItem; replay: boolean } | { ok: false; code: string }> {
  if (!input.confirm) return { ok: false, code: "confirmation_required" };
  if (typeof input.body !== "object" || !input.body || Array.isArray(input.body)) return { ok: false, code: "invalid_input" };
  const record = input.body as Record<string, unknown>;
  if (!isOperatorRcStatus(record.status)) return { ok: false, code: "invalid_input" };
  const remediation = sanitizeOperatorRemediation(record.remediation);
  if (!(await storeReady())) return { ok: false, code: "policy_release_candidate_store_unavailable" };
  try {
    const sb = requireSupabaseAdmin();
    const { data: existing, error } = await sb
      .from("partner_policy_release_candidates")
      .select("id, proposal_id, partner_id, status, shape, operator_note, history")
      .eq("id", input.candidateId)
      .maybeSingle();
    if (error) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    if (!existing) return { ok: false, code: "not_found" };
    if (existing.status === record.status) {
      const item = toItem(existing);
      if (releaseLeaks(item).length > 0) return { ok: false, code: "policy_release_candidate_store_unavailable" };
      await recordRcActivity({
        partnerId: existing.partner_id,
        eventType: "policy_release_candidate_reviewed",
        candidateRef: item.candidate_ref,
        proposalRef: item.proposal_ref,
        lifecycle: item.status,
        replay: true,
      });
      return { ok: true, item, replay: true };
    }
    if (!policyRcCanTransition(existing.status as PolicyRcState, record.status)) {
      return { ok: false, code: "invalid_transition" };
    }
    if (record.status === "ready_for_review") {
      const plan = planIssuersForReleaseShape(existing.shape);
      if (!plan.can_ready_for_review) return { ok: false, code: "no_verified_method" };
    }
    const history = Array.isArray(existing.history) ? existing.history : [];
    const { data, error: updateError } = await sb
      .from("partner_policy_release_candidates")
      .update({
        status: record.status,
        operator_note: remediation,
        reviewed_at: new Date().toISOString(),
        history: [...history, { status: record.status, at: new Date().toISOString() }],
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.candidateId)
      .eq("partner_id", existing.partner_id)
      .select("id, proposal_id, partner_id, status, shape, operator_note")
      .single();
    if (updateError || !data) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    const item = toItem(data);
    if (releaseLeaks(item).length > 0) return { ok: false, code: "policy_release_candidate_store_unavailable" };
    await recordRcActivity({
      partnerId: data.partner_id,
      eventType: "policy_release_candidate_reviewed",
      candidateRef: item.candidate_ref,
      proposalRef: item.proposal_ref,
      lifecycle: item.status,
    });
    return { ok: true, item, replay: false };
  } catch {
    return { ok: false, code: "policy_release_candidate_store_unavailable" };
  }
}
