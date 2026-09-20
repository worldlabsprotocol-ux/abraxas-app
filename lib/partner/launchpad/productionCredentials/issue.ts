// FILE: lib/partner/launchpad/productionCredentials/issue.ts
// Explicit operator issuance of one abx_live_ credential after review approval.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import { PRODUCTION_LIVE_KEY_SCOPES, type ProductionCredentialAction } from "./contract";
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

async function schemaReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const [keys, requests, policy] = await Promise.all([
      sb.from("partner_api_keys").select("id", { head: true, count: "exact" }).limit(0),
      sb.from("partner_production_access_requests").select("id", { head: true, count: "exact" }).limit(0),
      probePolicyChangeControlSchema(sb),
    ]);
    return !keys.error && !requests.error && policy.ready;
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

    const revoked = await liveKeyRevoked(application.production_api_key_id, request.partner_id);
    const state = productionCredentialState({
      productionApiKeyId: application.production_api_key_id,
      revoked,
      schemaReady: durable,
    });

    if (input.action === "issue") {
      if (state === "active") return { ok: false, code: "already_issued", credential_state: "active", ...NONE };
      return mintLiveKey({
        action: "issue",
        eventType: "production_credential_issued",
        application,
        requestId: request.id,
        partnerId: request.partner_id,
        previousKeyId: application.production_api_key_id,
      });
    }

    if (input.action === "rotate") {
      if (state !== "active") return { ok: false, code: "rotation_not_available", credential_state: state, ...NONE };
      return mintLiveKey({
        action: "rotate",
        eventType: "production_credential_rotated",
        application,
        requestId: request.id,
        partnerId: request.partner_id,
        previousKeyId: application.production_api_key_id,
      });
    }

    if (state !== "active" || !application.production_api_key_id) {
      return { ok: false, code: "revoke_not_available", credential_state: state, ...NONE };
    }
    const { error: revokeError } = await sb
      .from("partner_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", application.production_api_key_id)
      .eq("partner_id", request.partner_id);
    if (revokeError) return { ok: false, code: "production_credential_store_unavailable", ...NONE };
    await recordLaunchpadActivity(sb, {
      applicationId: application.id,
      partnerId: request.partner_id,
      eventType: "production_credential_revoked",
      publicCode: "production_credential_revoked",
      metadata: {
        request_id: request.id,
        policy_id: application.policy_id,
        policy_version: application.policy_version,
        issues_production_key: false,
        activates_production: false,
      },
    });
    const revokedResult: ProductionCredentialResult = {
      ok: true,
      action: "revoke",
      credential_state: "revoked",
      request_id: request.id,
      application_id: application.id,
      ...NONE,
    };
    if (productionCredentialLeaks(revokedResult).length > 0) {
      return { ok: false, code: "production_credential_store_unavailable", ...NONE };
    }
    return revokedResult;
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
    }
    return { ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable", ...NONE };
  }
}

async function mintLiveKey(input: {
  action: "issue" | "rotate";
  eventType: "production_credential_issued" | "production_credential_rotated";
  application: Awaited<ReturnType<typeof getLaunchpadApplicationForPartner>>;
  requestId: string;
  partnerId: string;
  previousKeyId: string | null;
}): Promise<ProductionCredentialResult> {
  if (!input.application) return { ok: false, code: "not_found", ...NONE };
  const minted = generatePartnerKey("live");
  if (!minted.raw.startsWith("abx_live_") || minted.prefix.startsWith("abx_test_")) {
    return { ok: false, code: "production_credential_store_unavailable", ...NONE };
  }
  const sb = requireSupabaseAdmin();
  const { data: newKey, error: insertError } = await sb
    .from("partner_api_keys")
    .insert({
      partner_id: input.partnerId,
      display_name: `${input.application.display_name} production`,
      key_prefix: minted.prefix,
      key_hash: minted.hash,
      scopes: [...PRODUCTION_LIVE_KEY_SCOPES],
    })
    .select("id")
    .single();
  if (insertError || !newKey) return { ok: false, code: "production_credential_store_unavailable", ...NONE };

  if (input.previousKeyId) {
    await sb
      .from("partner_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", input.previousKeyId)
      .eq("partner_id", input.partnerId);
  }

  const { error: updateError } = await sb
    .from("partner_launchpad_applications")
    .update({
      production_api_key_id: newKey.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.application.id)
    .eq("partner_id", input.partnerId)
    .eq("environment", input.application.environment);
  if (updateError) return { ok: false, code: "production_credential_store_unavailable", ...NONE };

  await recordLaunchpadActivity(sb, {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    eventType: input.eventType,
    publicCode: input.eventType,
    metadata: {
      request_id: input.requestId,
      key_prefix: minted.prefix,
      policy_id: input.application.policy_id,
      policy_version: input.application.policy_version,
      issues_production_key: true,
      activates_production: false,
    },
  });

  const result: ProductionCredentialResult = {
    ok: true,
    action: input.action,
    credential_state: input.action === "rotate" ? "rotating" : "active",
    key_prefix: minted.prefix,
    api_key: minted.raw,
    request_id: input.requestId,
    application_id: input.application.id,
    ...NONE,
  };
  if (productionCredentialLeaks(result, true).length > 0) {
    return { ok: false, code: "production_credential_store_unavailable", ...NONE };
  }
  return result;
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
