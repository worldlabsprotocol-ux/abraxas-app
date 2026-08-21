// FILE: lib/admin/partnerProductionEnvPromotion.ts
// Production partner environment promotion — route envelope helpers and RPC invoke.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";
import { resolveStrictProductionAdminAccess } from "@/lib/adminAuth";
import {
  isProductionAppOrigin,
  resolveConfiguredAppOrigin,
} from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import {
  partnerFlowReadinessJson,
} from "@/lib/admin/partnerFlowProductionRouteGate";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

export const ACTIVATE_PROMOTION_CHECK_KEYS = [
  "query_valid",
  "return_url_syntax_valid",
  "partner_row_exists",
  "partner_is_external",
  "partner_status_usable",
  "return_urls_configured",
  "return_url_request_allowlisted",
  "all_stored_return_urls_compliant",
  "policy_row_exists",
  "policy_active",
  "policy_partner_match",
  "policy_assigned_match",
  "policy_not_sandbox",
  "onboarding_fields_present",
] as const;

export const REVERSE_PROMOTION_CHECK_KEYS = [
  "query_valid",
  "partner_row_exists",
  "partner_is_external",
] as const;

export type ActivatePromotionCheckKey = (typeof ACTIVATE_PROMOTION_CHECK_KEYS)[number];
export type ReversePromotionCheckKey = (typeof REVERSE_PROMOTION_CHECK_KEYS)[number];

export interface ActivatePromotionBody {
  partner_id: string;
  confirm_partner_id: string;
  policy_id: string;
  return_url: string;
}

export interface ReversePromotionBody {
  partner_id: string;
  confirm_partner_id: string;
}

export interface PromotionRpcResult {
  ok: boolean;
  code?: string;
  checks?: Record<string, boolean>;
  partner_id?: string;
  allowed_environments?: string[];
  status?: string;
  already_production_enabled?: boolean;
  already_reversed?: boolean;
  audit_event_id?: string | null;
  error?: string;
}

export function promotionJson(body: unknown, init?: { status?: number }): NextResponse {
  return partnerFlowReadinessJson(body, init);
}

export function guardProductionAdminMutationOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin?.trim()) {
    return promotionJson({ error: "Forbidden", code: "origin_required" }, { status: 403 });
  }

  const configured = resolveConfiguredAppOrigin();
  if (!configured || !isProductionAppOrigin(configured)) {
    return promotionJson({ error: "Forbidden", code: "origin_mismatch" }, { status: 403 });
  }

  const normalizedOrigin = origin.trim().replace(/\/$/, "").toLowerCase();
  const normalizedConfigured = configured.replace(/\/$/, "").toLowerCase();
  if (normalizedOrigin !== normalizedConfigured) {
    return promotionJson({ error: "Forbidden", code: "origin_mismatch" }, { status: 403 });
  }

  return null;
}

function isValidHttpsReturnUrlSyntax(returnUrl: string): boolean {
  try {
    const parsed = new URL(returnUrl);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseActivatePromotionBody(body: unknown):
  | { ok: true; value: ActivatePromotionBody }
  | { ok: false; error: string } {
  const record = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const partnerId = typeof record.partner_id === "string" ? record.partner_id.trim() : "";
  const confirmPartnerId = typeof record.confirm_partner_id === "string"
    ? record.confirm_partner_id.trim()
    : "";
  const policyId = typeof record.policy_id === "string" ? record.policy_id.trim() : "";
  const returnUrl = typeof record.return_url === "string" ? record.return_url.trim() : "";

  if (!partnerId || !confirmPartnerId || !policyId || !returnUrl) {
    return { ok: false, error: "partner_id, confirm_partner_id, policy_id, and return_url are required" };
  }
  if (!ID_PATTERN.test(partnerId) || !ID_PATTERN.test(policyId)) {
    return { ok: false, error: "Invalid partner_id or policy_id" };
  }
  if (confirmPartnerId !== partnerId) {
    return { ok: false, error: "confirm_partner_id must match partner_id exactly" };
  }
  if (!isValidHttpsReturnUrlSyntax(returnUrl)) {
    return { ok: false, error: "return_url must be a valid HTTPS URL" };
  }

  return {
    ok: true,
    value: {
      partner_id: partnerId,
      confirm_partner_id: confirmPartnerId,
      policy_id: policyId,
      return_url: returnUrl,
    },
  };
}

export function parseReversePromotionBody(body: unknown):
  | { ok: true; value: ReversePromotionBody }
  | { ok: false; error: string } {
  const record = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const partnerId = typeof record.partner_id === "string" ? record.partner_id.trim() : "";
  const confirmPartnerId = typeof record.confirm_partner_id === "string"
    ? record.confirm_partner_id.trim()
    : "";

  if (!partnerId || !confirmPartnerId) {
    return { ok: false, error: "partner_id and confirm_partner_id are required" };
  }
  if (!ID_PATTERN.test(partnerId)) {
    return { ok: false, error: "Invalid partner_id" };
  }
  if (confirmPartnerId !== partnerId) {
    return { ok: false, error: "confirm_partner_id must match partner_id exactly" };
  }

  return {
    ok: true,
    value: { partner_id: partnerId, confirm_partner_id: confirmPartnerId },
  };
}

export function promotionChecksAreBooleanOnly(
  checks: unknown,
  allowedKeys: readonly string[],
): checks is Record<string, boolean> {
  if (!checks || typeof checks !== "object") return false;
  const record = checks as Record<string, unknown>;
  for (const key of allowedKeys) {
    if (typeof record[key] !== "boolean") return false;
  }
  return true;
}

export async function invokePartnerProductionEnvPromoteRpc(input: {
  partnerId: string;
  policyId: string | null;
  returnUrl: string | null;
  operation: "activate" | "reverse";
  actorCategory: string;
}): Promise<{ data: PromotionRpcResult | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return { data: null, error: "Supabase not configured" };
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("partner_production_env_promote_atomic", {
    p_partner_id: input.partnerId,
    p_policy_id: input.policyId,
    p_return_url: input.returnUrl,
    p_operation: input.operation,
    p_actor_category: input.actorCategory,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as PromotionRpcResult, error: null };
}

export async function handleProductionEnvPromotionPost(
  req: NextRequest,
  operation: "activate" | "reverse",
  parseBody: (body: unknown) =>
    | { ok: true; value: ActivatePromotionBody | ReversePromotionBody }
    | { ok: false; error: string },
): Promise<NextResponse> {
  const access = await resolveStrictProductionAdminAccess(req);
  if (!access.authorized) {
    return promotionJson({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return promotionJson({ error: "Invalid JSON body", code: "invalid_request" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed.ok) {
    return promotionJson({ error: parsed.error, code: "invalid_request" }, { status: 400 });
  }

  const actorCategory = resolveAdminActorCategory(access.method);
  const value = parsed.value;

  const rpcInput = operation === "activate"
    ? {
        partnerId: value.partner_id,
        policyId: (value as ActivatePromotionBody).policy_id,
        returnUrl: (value as ActivatePromotionBody).return_url,
        operation,
        actorCategory,
      }
    : {
        partnerId: value.partner_id,
        policyId: null,
        returnUrl: null,
        operation,
        actorCategory,
      };

  const { data, error } = await invokePartnerProductionEnvPromoteRpc(rpcInput);
  if (error) {
    if (error === "Supabase not configured") {
      return promotionJson({ error }, { status: 503 });
    }
    console.error(`partner_production_env_${operation}_rpc_failed`, error);
    return promotionJson({ error: "Internal server error" }, { status: 500 });
  }

  if (!data?.ok) {
    if (data?.code === "readiness_failed" && data.checks) {
      const allowedKeys = operation === "activate"
        ? ACTIVATE_PROMOTION_CHECK_KEYS
        : REVERSE_PROMOTION_CHECK_KEYS;
      if (promotionChecksAreBooleanOnly(data.checks, allowedKeys)) {
        return promotionJson(
          {
            error: operation === "activate"
              ? "Partner not ready for production environment"
              : "Partner not eligible for production environment reversal",
            code: "readiness_failed",
            checks: data.checks,
          },
          { status: 409 },
        );
      }
    }
    if (data?.code === "partner_not_found") {
      return promotionJson({ error: "Partner not found", code: "partner_not_found" }, { status: 404 });
    }
    return promotionJson({ error: "Internal server error" }, { status: 500 });
  }

  return promotionJson({
    ok: true,
    partner_id: data.partner_id,
    allowed_environments: data.allowed_environments,
    status: data.status,
    already_production_enabled: data.already_production_enabled ?? false,
    already_reversed: data.already_reversed ?? false,
    audit_event_id: data.audit_event_id ?? null,
  });
}
