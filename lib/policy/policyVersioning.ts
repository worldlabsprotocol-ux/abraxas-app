// FILE: lib/policy/policyVersioning.ts
// Operator workflow for immutable policy versions (not self-serve partner onboarding).

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { PartnerPolicy, PartnerPolicyRules } from "@/lib/policy/types";
import {
  PolicyImmutabilityError,
  assertPolicyStatusTransition,
  assertPolicyVersionMonotonic,
  isPolicyDraft,
} from "@/lib/policy/policyLifecycle";
import { getPartnerPolicy, getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import {
  mapPublishPolicyDraftRpcError,
  parsePublishPolicyDraftRpcResult,
} from "@/lib/policy/publishPolicyDraftRpc";

export interface PolicyVersionSummary {
  id: string;
  version: number;
  status: string;
  name: string;
  partner_id: string;
  effective_at: string;
  created_at: string;
}

export async function listPolicyVersions(policyId: string): Promise<PolicyVersionSummary[]> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_policies")
    .select("id, version, status, name, partner_id, effective_at, created_at")
    .eq("id", policyId)
    .order("version", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PolicyVersionSummary[];
}

export async function createInitialPolicyDraft(input: {
  policyId: string;
  partnerId: string;
  name: string;
  rulesJson?: PartnerPolicyRules;
}): Promise<PartnerPolicy> {
  const sb = requireSupabaseAdmin();

  const { data: existing } = await sb
    .from("partner_policies")
    .select("id")
    .eq("id", input.policyId)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new PolicyImmutabilityError(`Policy id already exists: ${input.policyId}`);
  }

  const row = {
    id: input.policyId,
    partner_id: input.partnerId,
    version: 1,
    name: input.name,
    rules_json: input.rulesJson ?? {},
    status: "draft",
    effective_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("partner_policies")
    .insert(row)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PartnerPolicy;
}

export async function createPolicyDraftFromActive(input: {
  policyId: string;
  rulesJson?: PartnerPolicyRules;
  name?: string;
}): Promise<PartnerPolicy> {
  const sb = requireSupabaseAdmin();
  const active = await getPartnerPolicy(input.policyId);
  if (!active) {
    throw new PolicyImmutabilityError(`Active policy not found: ${input.policyId}`);
  }

  const versions = await listPolicyVersions(input.policyId);
  const nextVersion = Math.max(...versions.map(v => v.version), 0) + 1;
  assertPolicyVersionMonotonic(
    versions.map(v => v.version),
    nextVersion,
  );

  const draftExists = versions.some(v => v.status === "draft");
  if (draftExists) {
    throw new PolicyImmutabilityError(
      `Draft already exists for policy ${input.policyId}; publish or delete it before creating another`,
    );
  }

  const row = {
    id: active.id,
    partner_id: active.partner_id,
    version: nextVersion,
    name: input.name ?? active.name,
    rules_json: input.rulesJson ?? active.rules_json,
    status: "draft",
    effective_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("partner_policies")
    .insert(row)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PartnerPolicy;
}

export async function updatePolicyDraft(input: {
  policyId: string;
  version: number;
  rulesJson?: PartnerPolicyRules;
  name?: string;
}): Promise<PartnerPolicy> {
  const sb = requireSupabaseAdmin();
  const current = await getPartnerPolicyAtVersion(input.policyId, input.version);
  if (!current) {
    throw new PolicyImmutabilityError(`Policy version not found: ${input.policyId} v${input.version}`);
  }
  if (!isPolicyDraft(current.status)) {
    throw new PolicyImmutabilityError(
      `Only draft policy versions are editable (${input.policyId} v${input.version} is ${current.status})`,
    );
  }

  const patch: Record<string, unknown> = {};
  if (input.rulesJson !== undefined) patch.rules_json = input.rulesJson;
  if (input.name !== undefined) patch.name = input.name;

  const { data, error } = await sb
    .from("partner_policies")
    .update(patch)
    .eq("id", input.policyId)
    .eq("version", input.version)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PartnerPolicy;
}

export async function publishPolicyDraft(input: {
  policyId: string;
  version: number;
}): Promise<{ published: PartnerPolicy; deprecatedVersion: number | null }> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("publish_partner_policy_draft", {
    p_policy_id: input.policyId,
    p_target_version: input.version,
  });

  if (error) {
    throw mapPublishPolicyDraftRpcError(error);
  }

  const parsed = parsePublishPolicyDraftRpcResult(data);
  return { published: parsed.published, deprecatedVersion: parsed.deprecatedVersion };
}

export async function deprecatePolicyVersion(input: {
  policyId: string;
  version: number;
}): Promise<PartnerPolicy> {
  const sb = requireSupabaseAdmin();
  const current = await getPartnerPolicyAtVersion(input.policyId, input.version);
  if (!current) {
    throw new PolicyImmutabilityError(`Policy version not found: ${input.policyId} v${input.version}`);
  }
  if (current.status !== "active") {
    throw new PolicyImmutabilityError(
      `Only active versions can be deprecated (${input.policyId} v${input.version} is ${current.status})`,
    );
  }

  assertPolicyStatusTransition(current.status, "deprecated");

  const { data, error } = await sb
    .from("partner_policies")
    .update({ status: "deprecated" })
    .eq("id", input.policyId)
    .eq("version", input.version)
    .eq("status", "active")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PartnerPolicy;
}
