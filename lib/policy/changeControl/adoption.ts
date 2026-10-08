// FILE: lib/policy/changeControl/adoption.ts
// Explicit, auditable policy version adoption for Launchpad applications.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";
import { evaluatePolicyVersionGate } from "@/lib/policy/changeControl/issuance";
import {
  assertPolicyChangeControlSchemaReady,
  isPolicySchemaMissingError,
} from "@/lib/policy/changeControl/schemaReady";

const ADOPT_RPC = "partner_policy_adopt_version_atomic";

type AdoptRpcResult = {
  ok?: boolean;
  code?: string;
  application?: LaunchpadApplicationRow;
  from_version?: number;
  to_version?: number;
  idempotent_replay?: boolean;
};

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

  await assertPolicyChangeControlSchemaReady();

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc(ADOPT_RPC, {
    p_application_id: app.id,
    p_partner_id: app.partner_id,
    p_policy_id: app.policy_id,
    p_from_version: app.policy_version,
    p_to_version: input.toVersion,
    p_actor_id: input.actorId ?? null,
  });

  if (error) {
    if (isPolicySchemaMissingError(error)) {
      throw new PolicyChangeControlError("policy_schema_unavailable");
    }
    throw new Error("policy_adoption_rpc_failed");
  }

  const result = (data ?? {}) as AdoptRpcResult;
  if (!result.ok) {
    if (result.code === "policy_version_mismatched") {
      throw new PolicyChangeControlError("policy_version_mismatched", "Application pin changed concurrently");
    }
    if (result.code === "not_found") {
      throw new PolicyChangeControlError("policy_version_unknown");
    }
    throw new Error("policy_adoption_write_failed");
  }

  if (!result.application) {
    throw new Error("policy_adoption_rpc_failed");
  }

  return {
    application: result.application,
    from_version: result.from_version ?? app.policy_version,
    to_version: result.to_version ?? input.toVersion,
    idempotent_replay: result.idempotent_replay === true,
  };
}
