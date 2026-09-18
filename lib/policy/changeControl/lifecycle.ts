// FILE: lib/policy/changeControl/lifecycle.ts
// Partner-scoped policy version lifecycle. Published rows are never mutated in place.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { PartnerPolicy, PartnerPolicyRules } from "@/lib/policy/types";
import { PolicyImmutabilityError, isPolicyDraft } from "@/lib/policy/policyLifecycle";
import {
  createPolicyDraftFromActive,
  deprecatePolicyVersion,
  listPolicyVersions,
  publishPolicyDraft,
  updatePolicyDraft,
} from "@/lib/policy/policyVersioning";
import { getPartnerPolicy, getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";
import { assertDraftPublishable } from "@/lib/policy/changeControl/validateDraft";
import { appendPolicyLifecycleAudit } from "@/lib/policy/changeControl/audit";
import { evaluatePolicyVersionGate } from "@/lib/policy/changeControl/issuance";

export async function loadPartnerPolicyFamily(input: {
  policyId: string;
  partnerId: string;
}): Promise<PartnerPolicy[]> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_policies")
    .select("*")
    .eq("id", input.policyId)
    .eq("partner_id", input.partnerId)
    .order("version", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerPolicy[];
}

export async function assertPartnerOwnsPolicy(input: {
  policyId: string;
  partnerId: string;
  version?: number;
}): Promise<PartnerPolicy> {
  const policy = input.version != null
    ? await getPartnerPolicyAtVersion(input.policyId, input.version)
    : await getPartnerPolicy(input.policyId);
  if (!policy) {
    throw new PolicyChangeControlError("policy_version_unknown");
  }
  if (policy.partner_id !== input.partnerId) {
    throw new PolicyChangeControlError("policy_wrong_partner");
  }
  return policy;
}

export async function createPartnerPolicyDraftSuccessor(input: {
  policyId: string;
  partnerId: string;
  actorId?: string | null;
  rulesJson?: PartnerPolicyRules;
  name?: string;
}): Promise<PartnerPolicy> {
  await assertPartnerOwnsPolicy({ policyId: input.policyId, partnerId: input.partnerId });
  const draft = await createPolicyDraftFromActive({
    policyId: input.policyId,
    rulesJson: input.rulesJson,
    name: input.name,
  });
  await appendPolicyLifecycleAudit({
    policyId: draft.id,
    version: draft.version,
    partnerId: input.partnerId,
    eventType: "created",
    actorId: input.actorId,
    toVersion: draft.version,
    fromVersion: draft.version - 1,
  });
  return draft;
}

export async function editPartnerPolicyDraft(input: {
  policyId: string;
  partnerId: string;
  version: number;
  actorId?: string | null;
  rulesJson?: PartnerPolicyRules;
  name?: string;
}): Promise<PartnerPolicy> {
  const current = await assertPartnerOwnsPolicy({
    policyId: input.policyId,
    partnerId: input.partnerId,
    version: input.version,
  });
  if (!isPolicyDraft(current.status)) {
    throw new PolicyChangeControlError("policy_immutability_violation", "Published versions cannot be edited");
  }
  const draft = await updatePolicyDraft({
    policyId: input.policyId,
    version: input.version,
    rulesJson: input.rulesJson,
    name: input.name,
  });
  await appendPolicyLifecycleAudit({
    policyId: draft.id,
    version: draft.version,
    partnerId: input.partnerId,
    eventType: "draft_changed",
    actorId: input.actorId,
  });
  return draft;
}

export async function publishPartnerPolicyDraftVersion(input: {
  policyId: string;
  partnerId: string;
  version: number;
  actorId?: string | null;
}): Promise<{ published: PartnerPolicy; deprecatedVersion: number | null }> {
  const draft = await assertPartnerOwnsPolicy({
    policyId: input.policyId,
    partnerId: input.partnerId,
    version: input.version,
  });
  assertDraftPublishable(draft);
  const result = await publishPolicyDraft({ policyId: input.policyId, version: input.version });
  await appendPolicyLifecycleAudit({
    policyId: result.published.id,
    version: result.published.version,
    partnerId: input.partnerId,
    eventType: "published",
    actorId: input.actorId,
    fromVersion: result.deprecatedVersion,
    toVersion: result.published.version,
  });
  if (result.deprecatedVersion != null) {
    await appendPolicyLifecycleAudit({
      policyId: input.policyId,
      version: result.deprecatedVersion,
      partnerId: input.partnerId,
      eventType: "deprecated",
      actorId: input.actorId,
      fromVersion: result.deprecatedVersion,
      toVersion: result.published.version,
      safeCode: "superseded_by_publish",
    });
  }
  return result;
}

export async function deprecatePartnerPolicyVersion(input: {
  policyId: string;
  partnerId: string;
  version: number;
  actorId?: string | null;
  deprecateEffectiveAt?: string | null;
}): Promise<PartnerPolicy> {
  const current = await assertPartnerOwnsPolicy({
    policyId: input.policyId,
    partnerId: input.partnerId,
    version: input.version,
  });
  if (current.status !== "active") {
    throw new PolicyChangeControlError("policy_immutability_violation", "Only active versions can be deprecated");
  }

  const effectiveAt = input.deprecateEffectiveAt?.trim() || null;
  if (effectiveAt) {
    const when = Date.parse(effectiveAt);
    if (Number.isNaN(when)) {
      throw new PolicyChangeControlError("policy_publish_invalid", "deprecate_effective_at is invalid");
    }
    if (when > Date.now()) {
      const sb = requireSupabaseAdmin();
      const { data, error } = await sb
        .from("partner_policies")
        .update({ deprecate_effective_at: new Date(when).toISOString() })
        .eq("id", input.policyId)
        .eq("version", input.version)
        .eq("status", "active")
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await appendPolicyLifecycleAudit({
        policyId: input.policyId,
        version: input.version,
        partnerId: input.partnerId,
        eventType: "deprecated",
        actorId: input.actorId,
        safeCode: "scheduled",
        metadata: { deprecate_effective_at: new Date(when).toISOString() },
      });
      return data as PartnerPolicy;
    }

    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_policies")
      .update({
        status: "deprecated",
        deprecate_effective_at: new Date(when).toISOString(),
      })
      .eq("id", input.policyId)
      .eq("version", input.version)
      .eq("status", "active")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await appendPolicyLifecycleAudit({
      policyId: input.policyId,
      version: input.version,
      partnerId: input.partnerId,
      eventType: "deprecated",
      actorId: input.actorId,
      safeCode: "effective",
      metadata: { deprecate_effective_at: new Date(when).toISOString() },
    });
    return data as PartnerPolicy;
  }

  const policy = await deprecatePolicyVersion({ policyId: input.policyId, version: input.version });
  await appendPolicyLifecycleAudit({
    policyId: input.policyId,
    version: input.version,
    partnerId: input.partnerId,
    eventType: "deprecated",
    actorId: input.actorId,
    safeCode: effectiveAt ? "effective" : "immediate",
    metadata: effectiveAt ? { deprecate_effective_at: new Date(effectiveAt).toISOString() } : undefined,
  });
  return policy;
}

export async function deletePartnerPolicyDraft(input: {
  policyId: string;
  partnerId: string;
  version: number;
}): Promise<void> {
  const current = await assertPartnerOwnsPolicy({
    policyId: input.policyId,
    partnerId: input.partnerId,
    version: input.version,
  });
  if (!isPolicyDraft(current.status)) {
    throw new PolicyChangeControlError("policy_immutability_violation");
  }

  const sb = requireSupabaseAdmin();
  const { count: receiptCount } = await sb
    .from("decision_receipts")
    .select("id", { count: "exact", head: true })
    .eq("policy_id", input.policyId)
    .eq("policy_version", input.version);
  if ((receiptCount ?? 0) > 0) {
    throw new PolicyChangeControlError("policy_version_has_receipts");
  }

  const { count: bindingCount } = await sb
    .from("partner_launchpad_applications")
    .select("id", { count: "exact", head: true })
    .eq("policy_id", input.policyId)
    .eq("policy_version", input.version);
  if ((bindingCount ?? 0) > 0) {
    throw new PolicyChangeControlError("policy_version_has_active_bindings");
  }

  const { error } = await sb
    .from("partner_policies")
    .delete()
    .eq("id", input.policyId)
    .eq("version", input.version)
    .eq("status", "draft");
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("issued receipts") || message.includes("issued decisions")) {
      throw new PolicyChangeControlError("policy_version_has_receipts");
    }
    if (message.includes("bindings") || message.includes("adoption")) {
      throw new PolicyChangeControlError("policy_version_has_active_bindings");
    }
    throw new PolicyImmutabilityError(error.message);
  }
}

export async function resolveIssuablePolicyForPartner(input: {
  policyId: string;
  partnerId: string;
  expectedVersion?: number | null;
  now?: Date;
}): Promise<PartnerPolicy> {
  const policy = input.expectedVersion != null
    ? await getPartnerPolicyAtVersion(input.policyId, input.expectedVersion)
    : await getPartnerPolicy(input.policyId);
  const gate = evaluatePolicyVersionGate({
    policy,
    partnerId: input.partnerId,
    expectedVersion: input.expectedVersion,
    now: input.now,
    mode: "production_receipt",
  });
  if (!gate.ok) {
    throw new PolicyChangeControlError(gate.code);
  }
  return gate.policy;
}

export { listPolicyVersions };
