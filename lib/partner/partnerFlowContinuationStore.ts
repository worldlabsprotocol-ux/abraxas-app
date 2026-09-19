// FILE: lib/partner/partnerFlowContinuationStore.ts
// Persist tenant-scoped Partner Flow continuations (no receipts, no PII).

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  PartnerFlowContinuationRecord,
  PartnerFlowContinuationStore,
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

export function createSupabaseContinuationStore(): PartnerFlowContinuationStore {
  return {
    async save(record) {
      const sb = requireSupabaseAdmin();
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
      if (error) throw new Error("continuation_store_unavailable");
    },
    async peek(jti) {
      const sb = requireSupabaseAdmin();
      const { data, error } = await sb
        .from("partner_flow_continuations")
        .select("*")
        .eq("jti", jti)
        .maybeSingle();
      if (error || !data) return null;
      return mapRow(data as Record<string, unknown>);
    },
    async consume(jti) {
      const sb = requireSupabaseAdmin();
      const { data: existing, error: readError } = await sb
        .from("partner_flow_continuations")
        .select("*")
        .eq("jti", jti)
        .is("consumed_at", null)
        .maybeSingle();
      if (readError || !existing) return null;

      const consumedAt = new Date().toISOString();
      const { data: updated, error: writeError } = await sb
        .from("partner_flow_continuations")
        .update({ consumed_at: consumedAt })
        .eq("jti", jti)
        .is("consumed_at", null)
        .select("*")
        .maybeSingle();
      if (writeError || !updated) return null;
      return mapRow(existing as Record<string, unknown>);
    },
  };
}
