// FILE: lib/partner/partnerFlowContinuationStore.ts
// Database-backed continuations only. Missing 091 objects fail closed.

import {
  assertAttachableVerificationRequestId,
  continuationVerifyRequestColumns,
  normalizeContinuationVerifyRequestId,
  readContinuationVerifyRequestId,
} from "@/lib/partner/partnerFlowContinuationIdentifiers";
import { isOpaqueVerifyRequest } from "@/lib/partner/productionIntegration/requestCorrelation";
import { isPostgresUniqueViolation } from "@/lib/partner/partnerFlowContinuationPostgresErrors";
import { canonicalPartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ContinuationStoreUnavailableError,
  ContinuationUniqueConflictError,
  type PartnerFlowContinuationRecord,
  type PartnerFlowContinuationStore,
} from "@/lib/partner/partnerFlowContinuation";

const OPAQUE_PEEK_RPC = "partner_flow_continuation_peek_by_opaque";

function readExpiresAt(row: Record<string, unknown>): { raw: string; mapped: string } {
  const raw = String(row.expires_at ?? "");
  return {
    raw,
    mapped: canonicalPartnerFlowInstant(raw) ?? raw,
  };
}

function mapRow(row: Record<string, unknown>): PartnerFlowContinuationRecord {
  const expiresAt = readExpiresAt(row);
  return {
    jti: String(row.jti ?? ""),
    partnerId: String(row.partner_id ?? ""),
    policyId: String(row.policy_id ?? ""),
    policyVersion: typeof row.policy_version === "number"
      ? row.policy_version
      : typeof row.policy_version === "string" && row.policy_version.trim()
        ? Number.parseInt(row.policy_version, 10)
        : undefined,
    returnUrl: String(row.return_url ?? ""),
    permission: typeof row.permission === "string" ? row.permission : undefined,
    permissionVersion: typeof row.permission_version === "string" ? row.permission_version : undefined,
    purpose: typeof row.purpose === "string" ? row.purpose : undefined,
    appSlug: typeof row.app_slug === "string" ? row.app_slug : undefined,
    createdAt: String(row.created_at ?? ""),
    expiresAt: expiresAt.mapped,
    consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    verifyRequestId: readContinuationVerifyRequestId(row),
    _diagRawExpiresAt: expiresAt.raw,
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
      const verifyColumns = continuationVerifyRequestColumns(record.verifyRequestId);
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
        verify_request_id: verifyColumns.verify_request_id,
        opaque_verify_request: verifyColumns.opaque_verify_request,
        consumed_at: record.consumedAt ?? null,
        expires_at: record.expiresAt,
        created_at: record.createdAt,
      });
      if (
        isPostgresUniqueViolation(error)
        && verifyColumns.opaque_verify_request
        && record.verifyRequestId
      ) {
        throw new ContinuationUniqueConflictError(record.verifyRequestId);
      }
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
      const trimmed = normalizeContinuationVerifyRequestId(verifyRequestId);
      if (!trimmed) return null;

      const sb = adminClient();
      if (isOpaqueVerifyRequest(trimmed)) {
        const { data, error } = await sb.rpc(OPAQUE_PEEK_RPC, { p_opaque: trimmed });
        assertStoreAvailable(error);
        const row = Array.isArray(data) ? data[0] : data;
        return row ? mapRow(row as Record<string, unknown>) : null;
      }

      const { data, error } = await sb
        .from("partner_flow_continuations")
        .select("*")
        .eq("verify_request_id", trimmed)
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
      assertAttachableVerificationRequestId(verifyRequestId);
      const sb = adminClient();
      const { error } = await sb
        .from("partner_flow_continuations")
        .update({
          verify_request_id: verifyRequestId,
          opaque_verify_request: null,
        })
        .eq("jti", jti);
      assertStoreAvailable(error);
    },
  };
}
