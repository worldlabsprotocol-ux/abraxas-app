// FILE: lib/partner/launchpad/productionCredentials/issue.ts
// Explicit operator issuance of one abx_live_ credential after review approval.
// Writes go through the durable operate RPC only.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import type { ProductionCredentialAction } from "./contract";
import { evaluateProductionCredentialPrereqs, productionCredentialLeaks, productionCredentialState } from "./evaluate";

export interface ProductionCredentialResult {
  ok: boolean;
  action?: ProductionCredentialAction;
  credential_state?: ReturnType<typeof productionCredentialState> | "rotating";
  key_prefix?: string;
  api_key?: string;
  request_id?: string;
  application_id?: string;
  activates_mainnet: false;
  executes: false;
  environment_changed: false;
  code?: string;
}

const NONE = { activates_mainnet: false as const, executes: false as const, environment_changed: false as const };
const ATOMIC_RPC = "partner_launchpad_operate_production_credential_atomic";

type RpcRow = {
  ok?: boolean;
  code?: string;
  action?: string;
  credential_state?: string;
  key_prefix?: string;
  request_id?: string;
  application_id?: string;
  activates_mainnet?: boolean;
  executes?: boolean;
  environment_changed?: boolean;
};

async function schemaReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const [keys, requests, policy, rpc] = await Promise.all([
      sb.from("partner_api_keys").select("id", { head: true, count: "exact" }).limit(0),
      sb.from("partner_production_access_requests").select("id", { head: true, count: "exact" }).limit(0),
      probePolicyChangeControlSchema(sb),
      sb.rpc(ATOMIC_RPC, {
        p_request_id: "00000000-0000-0000-0000-000000000000",
        p_action: "revoke",
      }),
    ]);
    const missingRpc = Boolean(
      rpc.error && /could not find the function|schema cache|does not exist/i.test(rpc.error.message ?? ""),
    );
    return !keys.error && !requests.error && policy.ready && !missingRpc;
  } catch {
    return false;
  }
}

async function liveKeyRevoked(keyId: string | null, partnerId: string): Promise<boolean> {
  if (!keyId) return false;
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_api_keys")
    .select("id, revoked_at, key_prefix")
    .eq("id", keyId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (!data) return true;
  if (typeof data.key_prefix === "string" && data.key_prefix.startsWith("abx_test_")) return true;
  return Boolean(data.revoked_at);
}

function safeResult(row: RpcRow, raw?: string): ProductionCredentialResult {
  const minted = row.ok && (row.code === "issued" || row.code === "rotated") && raw;
  const result: ProductionCredentialResult = {
    ok: Boolean(row.ok),
    action: (row.action as ProductionCredentialAction | undefined) ?? undefined,
    credential_state: row.credential_state as ProductionCredentialResult["credential_state"],
    key_prefix: minted ? row.key_prefix : undefined,
    api_key: minted ? raw : undefined,
    request_id: row.request_id,
    application_id: row.application_id,
    code: row.code,
    ...NONE,
  };
  if (productionCredentialLeaks(result, Boolean(minted)).length > 0) {
    return { ok: false, code: "production_credential_store_unavailable", ...NONE };
  }
  return result;
}

export async function operateProductionCredential(input: {
  requestId: string;
  action: ProductionCredentialAction;
  confirm: boolean;
}): Promise<ProductionCredentialResult> {
  if (!input.confirm) return { ok: false, code: "confirmation_required", ...NONE };
  try {
    const durable = await schemaReady();
    if (!durable) return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };

    const sb = requireSupabaseAdmin();
    const { data: request, error } = await sb
      .from("partner_production_access_requests")
      .select("id, application_id, partner_id, status, request_notes, created_at, reviewed_at")
      .eq("id", input.requestId)
      .maybeSingle();
    if (error) return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
    if (!request) return { ok: false, code: "not_found", ...NONE };

    const application = await getLaunchpadApplicationForPartner(request.application_id, request.partner_id);
    if (!application) return { ok: false, code: "not_found", ...NONE };

    const evidence = await loadGoLiveEvidence({ application, partnerId: request.partner_id });
    const gates = evaluateProductionCredentialPrereqs({
      request,
      application,
      evidence,
      durableSchemaReady: durable,
    });
    if (!gates.ok) {
      return {
        ok: false,
        code: request.status === "pending" || request.status === "rejected" ? "review_not_approved" : "production_credential_not_ready",
        ...NONE,
      };
    }

    let prefix: string | null = null;
    let hash: string | null = null;
    let raw: string | undefined;
    if (input.action === "issue" || input.action === "rotate") {
      const minted = generatePartnerKey("live");
      if (!minted.raw.startsWith("abx_live_") || minted.prefix.startsWith("abx_test_")) {
        return { ok: false, code: "production_credential_store_unavailable", ...NONE };
      }
      prefix = minted.prefix;
      hash = minted.hash;
      raw = minted.raw;
    }

    const { data, error: rpcError } = await sb.rpc(ATOMIC_RPC, {
      p_request_id: input.requestId,
      p_action: input.action,
      p_key_prefix: prefix,
      p_key_hash: hash,
    });
    if (rpcError) return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
    return safeResult((data ?? {}) as RpcRow, raw);
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
    }
    return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
  }
}

export async function loadProductionCredentialStatus(requestId: string): Promise<ProductionCredentialResult> {
  try {
    const durable = await schemaReady();
    const sb = requireSupabaseAdmin();
    const { data: request, error } = await sb
      .from("partner_production_access_requests")
      .select("id, application_id, partner_id, status")
      .eq("id", requestId)
      .maybeSingle();
    if (error) return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
    if (!request) return { ok: false, code: "not_found", ...NONE };
    const application = await getLaunchpadApplicationForPartner(request.application_id, request.partner_id);
    if (!application) return { ok: false, code: "not_found", ...NONE };
    const revoked = await liveKeyRevoked(application.production_api_key_id, request.partner_id);
    const status: ProductionCredentialResult = {
      ok: true,
      credential_state: productionCredentialState({
        productionApiKeyId: application.production_api_key_id,
        revoked,
        schemaReady: durable,
      }),
      request_id: request.id,
      application_id: application.id,
      ...NONE,
    };
    if (productionCredentialLeaks(status).length > 0) {
      return { ok: false, code: "production_credential_store_unavailable", ...NONE };
    }
    return status;
  } catch {
    return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
  }
}
