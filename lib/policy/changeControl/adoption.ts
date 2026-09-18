// FILE: lib/policy/changeControl/adoption.ts
// Explicit, auditable policy version adoption for Launchpad applications.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";
import { evaluatePolicyVersionGate } from "@/lib/policy/changeControl/issuance";
import { appendPolicyLifecycleAudit } from "@/lib/policy/changeControl/audit";

export async function adoptPolicyVersionForApplication(input: {
  application: LaunchpadApplicationRow;
  toVersion: number;
  actorId?: string | null;
}): Promise<{
  application: LaunchpadApplicationRow;
  from_version: number;
  to_version: number;
  idempotent_replay: boolean;
}> {
  const app = input.application;
  if (app.policy_version === input.toVersion) {
    return {
      application: app,
      from_version: app.policy_version,
      to_version: input.toVersion,
      idempotent_replay: true,
    };
  }

  const target = await getPartnerPolicyAtVersion(app.policy_id, input.toVersion);
  const gate = evaluatePolicyVersionGate({
    policy: target,
    partnerId: app.partner_id,
    expectedVersion: input.toVersion,
    mode: "production_receipt",
  });
  if (!gate.ok) {
    throw new PolicyChangeControlError(gate.code);
  }

  const sb = requireSupabaseAdmin();
  const { data: updated, error: updateError } = await sb
    .from("partner_launchpad_applications")
    .update({ policy_version: input.toVersion, updated_at: new Date().toISOString() })
    .eq("id", app.id)
    .eq("partner_id", app.partner_id)
    .eq("policy_id", app.policy_id)
    .eq("policy_version", app.policy_version)
    .select("*")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updated) {
    throw new PolicyChangeControlError("policy_version_mismatched", "Application pin changed concurrently");
  }

  const { error: adoptionError } = await sb.from("partner_policy_adoptions").insert({
    application_id: app.id,
    partner_id: app.partner_id,
    policy_id: app.policy_id,
    from_version: app.policy_version,
    to_version: input.toVersion,
    actor_id: input.actorId ?? null,
  });
  if (adoptionError && !adoptionError.message.toLowerCase().includes("duplicate")) {
    throw new Error(adoptionError.message);
  }

  await appendPolicyLifecycleAudit({
    policyId: app.policy_id,
    version: input.toVersion,
    partnerId: app.partner_id,
    eventType: "adopted",
    actorId: input.actorId,
    applicationId: app.id,
    fromVersion: app.policy_version,
    toVersion: input.toVersion,
  });

  return {
    application: updated as LaunchpadApplicationRow,
    from_version: app.policy_version,
    to_version: input.toVersion,
    idempotent_replay: false,
  };
}
