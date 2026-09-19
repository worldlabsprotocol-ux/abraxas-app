// FILE: lib/partner/partnerFlowContinuationStore.ts
// Database-backed continuations only. Missing 091 objects fail closed.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ContinuationStoreUnavailableError,
  type PartnerFlowContinuationRecord,
  type PartnerFlowContinuationStore,
} from "@/lib/partner/partnerFlowContinuation";

function mapRow(row: Record<string, unknown>): PartnerFlowContinuationRecord {
  return {
    jti: String(row.jti ?? ""),
    partnerId: String(row.partner_id ?? ""),
    policyId: String(row.policy_id ?? ""),
    policyVersion: typeof row.policy_version === "number" ? row.policy_version : undefined,
    returnUrl: String(row.return_url ?? ""),
    permission: typeof row.permission === "string" ? row.permission : undefined,
    permissionVersion: typeof row.permission_version === "string" ? row.permission_version : undefined,
    purpose: typeof row.purpose === "string" ? row.purpose : undefined,
    appSlug: typeof row.app_slug === "string" ? row.app_slug : undefined,
    createdAt: String(row.created_at ?? ""),
    expiresAt: String(row.expires_at ?? ""),
    consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    verifyRequestId: row.verify_request_id ? String(row.verify_request_id) : null,
  };
}

function assertStoreAvailable(error: { message?: string; code?: string } | null): void {
  if (error) throw new ContinuationStoreUnavailableError();
}

function adminClient() {
  try {
    return requireSupabaseAdmin();
  } catch {
    throw new ContinuationStoreUnavailableError();
  }
}

export function createSupabaseContinuationStore(): PartnerFlowContinuationStore {
  return {
    async save(record) {
      const sb = adminClient();
      const { error } = await sb.from("partner_flow_continuations").upsert({
        jti: record.jti,
        partner_id: record.partnerId,
        policy_id: record.policyId,
        policy_version: record.policyVersion ?? null,
        return_url: record.returnUrl,
        permission: record.permission ?? null,
        permission_version: record.permissionVersion ?? null,
        purpose: record.purpose ?? null,
        app_slug: record.appSlug ?? null,
        verify_request_id: record.verifyRequestId ?? null,
        consumed_at: record.consumedAt ?? null,
        expires_at: record.expiresAt,
        created_at: record.createdAt,
      });
      assertStoreAvailable(error);
    },
    async peek(jti) {
      const sb = adminClient();
      const { data, error } = await sb
        .from("partner_flow_continuations")
        .select("*")
        .eq("jti", jti)
        .maybeSingle();
      assertStoreAvailable(error);
      return data ? mapRow(data as Record<string, unknown>) : null;
    },
    async peekByVerifyRequestId(verifyRequestId) {
      const sb = adminClient();
      const { data, error } = await sb
        .from("partner_flow_continuations")
        .select("*")
        .eq("verify_request_id", verifyRequestId)
        .maybeSingle();
      assertStoreAvailable(error);
      return data ? mapRow(data as Record<string, unknown>) : null;
    },
    async consume(jti) {
      const sb = adminClient();
      const { data: existing, error: readError } = await sb
        .from("partner_flow_continuations")
        .select("*")
        .eq("jti", jti)
        .is("consumed_at", null)
        .maybeSingle();
      assertStoreAvailable(readError);
      if (!existing) return null;

      const consumedAt = new Date().toISOString();
      const { data: updated, error: writeError } = await sb
        .from("partner_flow_continuations")
        .update({ consumed_at: consumedAt })
        .eq("jti", jti)
        .is("consumed_at", null)
        .select("*")
        .maybeSingle();
      assertStoreAvailable(writeError);
      if (!updated) return null;
      return mapRow(existing as Record<string, unknown>);
    },
    async attachVerifyRequestId(jti, verifyRequestId) {
      const sb = adminClient();
      const { error } = await sb
        .from("partner_flow_continuations")
        .update({ verify_request_id: verifyRequestId })
        .eq("jti", jti);
      assertStoreAvailable(error);
    },
  };
}
