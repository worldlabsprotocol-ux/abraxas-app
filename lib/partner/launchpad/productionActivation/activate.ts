// FILE: lib/partner/launchpad/productionActivation/activate.ts
// Canonical production activation transaction — one supported write path.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import {
  encryptProductionKeyForReveal,
} from "@/lib/partner/launchpad/productionKeyEnvelope";
import { evaluateProductionReviewGates } from "@/lib/partner/launchpad/productionReview/evaluate";
import {
  PRODUCTION_ACTIVATION_RPC,
  type ProductionActivationLifecycle,
} from "./contract";
import { resolveProductionActivationLifecycle } from "./goLiveState";

export interface ActivateProductionApplicationResult {
  ok: boolean;
  code?: string;
  idempotency_replay?: boolean;
  request_id?: string;
  application_id?: string;
  partner_id?: string;
  api_key_id?: string;
  key_prefix?: string;
  credential_state?: "active" | "revoked" | "never_issued";
  environment?: string;
  production_activated_at?: string;
  policy_id?: string;
  policy_version?: number;
  prior_environment?: string;
  lifecycle?: ProductionActivationLifecycle;
  issues_production_key: boolean;
  activates_mainnet: false;
  executes: false;
}

const NONE = { activates_mainnet: false as const, executes: false as const };

type RpcRow = {
  ok?: boolean;
  code?: string;
  request_id?: string;
  application_id?: string;
  partner_id?: string;
  api_key_id?: string;
  key_prefix?: string;
  credential_state?: string;
  environment?: string;
  production_activated_at?: string;
  policy_id?: string;
  policy_version?: number;
  prior_environment?: string;
  issues_production_key?: boolean;
};

async function activationRpcReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const [requests, apps, rpc] = await Promise.all([
      sb.from("partner_production_access_requests").select("id", { head: true, count: "exact" }).limit(0),
      sb.from("partner_launchpad_applications").select("production_activated_at", { head: true, count: "exact" }).limit(0),
      sb.rpc(PRODUCTION_ACTIVATION_RPC, {
        p_request_id: "00000000-0000-0000-0000-000000000000",
        p_key_prefix: null,
        p_key_hash: null,
        p_reviewer_notes: null,
      }),
    ]);
    const missingRpc = Boolean(
      rpc.error && /could not find the function|schema cache|does not exist/i.test(rpc.error.message ?? ""),
    );
    const missingColumn = Boolean(
      apps.error && /production_activated_at|column|schema/i.test(apps.error.message ?? ""),
    );
    return !requests.error && !missingColumn && !missingRpc;
  } catch {
    return false;
  }
}

export async function activateProductionApplication(input: {
  requestId: string;
  reviewerNotes?: string;
  confirm: boolean;
}): Promise<ActivateProductionApplicationResult> {
  if (!input.confirm) {
    return { ok: false, code: "confirmation_required", issues_production_key: false, ...NONE };
  }

  try {
    const durable = await activationRpcReady();
    if (!durable) {
      return { ok: false, code: "production_activation_store_unavailable", issues_production_key: false, ...NONE };
    }

    const sb = requireSupabaseAdmin();
    const { data: request, error } = await sb
      .from("partner_production_access_requests")
      .select("id, application_id, partner_id, status, request_notes, created_at, reviewed_at")
      .eq("id", input.requestId)
      .maybeSingle();
    if (error) return { ok: false, code: "production_activation_store_unavailable", issues_production_key: false, ...NONE };
    if (!request) return { ok: false, code: "not_found", issues_production_key: false, ...NONE };
    if (request.status === "rejected") {
      return { ok: false, code: "invalid_state", issues_production_key: false, ...NONE };
    }

    const application = await getLaunchpadApplicationForPartner(request.application_id, request.partner_id);
    if (!application) return { ok: false, code: "not_found", issues_production_key: false, ...NONE };

    const evidence = await loadGoLiveEvidence({ application, partnerId: request.partner_id });
    const schemaReady = await probePolicyChangeControlSchema(sb);
    const gates = evaluateProductionReviewGates({
      request: { ...request, status: request.status === "pending" ? "pending" : request.status },
      application,
      evidence,
      durableSchemaReady: schemaReady.ready,
    });

    const idempotencyReplay = Boolean(
      application.production_activated_at
      && request.status === "approved"
      && application.production_api_key_id,
    );

    if (!idempotencyReplay && request.status === "pending" && !gates.ok) {
      return {
        ok: false,
        code: "production_activation_not_ready",
        issues_production_key: false,
        ...NONE,
      };
    }

    let prefix: string | null = null;
    let hash: string | null = null;
    let raw: string | undefined;
    if (!idempotencyReplay) {
      const minted = generatePartnerKey("live");
      if (!minted.raw.startsWith("abx_live_") || minted.prefix.startsWith("abx_test_")) {
        return { ok: false, code: "production_activation_store_unavailable", issues_production_key: false, ...NONE };
      }
      prefix = minted.prefix;
      hash = minted.hash;
      raw = minted.raw;
    }

    const { data, error: rpcError } = await sb.rpc(PRODUCTION_ACTIVATION_RPC, {
      p_request_id: input.requestId,
      p_key_prefix: prefix,
      p_key_hash: hash,
      p_reviewer_notes: input.reviewerNotes ?? null,
    });
    if (rpcError) {
      return { ok: false, code: "production_activation_store_unavailable", issues_production_key: false, ...NONE };
    }

    const row = (data ?? {}) as RpcRow;
    if (!row.ok || !row.application_id || !row.partner_id || !row.api_key_id) {
      if (row.code === "not_found") return { ok: false, code: "not_found", issues_production_key: false, ...NONE };
      if (row.code === "invalid_state") return { ok: false, code: "invalid_state", issues_production_key: false, ...NONE };
      if (row.code === "already_issued") {
        return {
          ok: true,
          code: "idempotency_replay",
          idempotency_replay: true,
          request_id: row.request_id,
          application_id: row.application_id,
          partner_id: row.partner_id,
          api_key_id: row.api_key_id,
          key_prefix: row.key_prefix,
          credential_state: "active",
          environment: row.environment,
          production_activated_at: row.production_activated_at,
          policy_id: row.policy_id,
          policy_version: row.policy_version,
          prior_environment: row.prior_environment,
          lifecycle: "production_active",
          issues_production_key: false,
          ...NONE,
        };
      }
      return { ok: false, code: row.code ?? "activation_failed", issues_production_key: false, ...NONE };
    }

    const replay = row.code === "idempotency_replay";
    if (!replay && raw) {
      const encrypted = encryptProductionKeyForReveal(row.application_id, raw);
      if (encrypted) {
        await sb
          .from("partner_launchpad_applications")
          .update({
            production_key_encrypted: encrypted,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.application_id);
      }
    }

    const lifecycle = resolveProductionActivationLifecycle({
      application: {
        environment: row.environment === "production" ? "production" : application.environment,
        status: "active",
        production_activated_at: row.production_activated_at ?? application.production_activated_at ?? new Date().toISOString(),
        production_api_key_id: row.api_key_id,
      },
      requestStatus: "approved",
    });

    try {
      const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
      await recordIntegrationEventBestEffort({
        partnerId: row.partner_id,
        applicationId: row.application_id,
        environment: "production",
        eventType: "production_activation_completed",
        lifecycleStage: "activation",
        outcome: replay ? "idempotency_replay" : "activated",
        policyId: row.policy_id ?? application.policy_id,
        policyVersion: row.policy_version ?? application.policy_version,
        metadata: {
          idempotency_replay: replay,
          issues_production_key: row.issues_production_key === true,
          credential_state: (row.credential_state as string | undefined) ?? "active",
        },
      });
    } catch {
      // Observability must not block production activation.
    }

    return {
      ok: true,
      code: row.code,
      idempotency_replay: replay,
      request_id: row.request_id,
      application_id: row.application_id,
      partner_id: row.partner_id,
      api_key_id: row.api_key_id,
      key_prefix: row.key_prefix,
      credential_state: (row.credential_state as ActivateProductionApplicationResult["credential_state"]) ?? "active",
      environment: row.environment,
      production_activated_at: row.production_activated_at,
      policy_id: row.policy_id,
      policy_version: row.policy_version,
      prior_environment: row.prior_environment,
      lifecycle,
      issues_production_key: row.issues_production_key === true,
      ...NONE,
    };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, code: "production_activation_store_unavailable", issues_production_key: false, ...NONE };
    }
    return { ok: false, code: "production_activation_store_unavailable", issues_production_key: false, ...NONE };
  }
}
