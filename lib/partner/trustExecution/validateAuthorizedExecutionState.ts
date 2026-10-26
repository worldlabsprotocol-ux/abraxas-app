// FILE: lib/partner/trustExecution/validateAuthorizedExecutionState.ts

import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";

export async function assertAuthorizedPartnerPolicy(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const result = await querySovereignStagingPg<{ status: string }>(
    `select status from public.partner_policies
     where id = $1 and version = $2 and partner_id = $3
     limit 1`,
    [input.policyId, input.policyVersion, input.partnerId],
  );
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  const row = result.rows[0];
  if (!row) return { ok: false, code: "policy_not_authorized" };
  if (row.status !== "active") return { ok: false, code: "policy_not_active" };
  return { ok: true };
}

export async function assertAuthorizedIssuerSigningKey(
  signingKeyId: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const result = await querySovereignStagingPg<{ status: string }>(
    `select status from public.issuer_signing_keys where signing_key_id = $1 limit 1`,
    [signingKeyId],
  );
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  const row = result.rows[0];
  if (!row) return { ok: false, code: "signing_key_not_authorized" };
  if (row.status !== "active") return { ok: false, code: "signing_key_not_active" };
  return { ok: true };
}

export async function assertLaunchpadApplicationBinding(input: {
  partnerId: string;
  applicationId: string;
  policyId: string;
  policyVersion: number;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const result = await querySovereignStagingPg<{
    status: string;
    policy_id: string;
    policy_version: number;
  }>(
    `select status, policy_id, policy_version
     from public.partner_launchpad_applications
     where id = $1::uuid and partner_id = $2
     limit 1`,
    [input.applicationId, input.partnerId],
  );
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  const row = result.rows[0];
  if (!row || row.status !== "active") return { ok: false, code: "application_scope_invalid" };
  if (row.policy_id !== input.policyId || row.policy_version !== input.policyVersion) {
    return { ok: false, code: "application_policy_mismatch" };
  }
  return { ok: true };
}
