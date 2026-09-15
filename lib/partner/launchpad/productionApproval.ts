// FILE: lib/partner/launchpad/productionApproval.ts
// Atomic production access approval and one time production key reveal.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  decryptProductionKeyForReveal,
  encryptProductionKeyForReveal,
} from "@/lib/partner/launchpad/productionKeyEnvelope";

export type ApproveProductionResult =
  | {
      ok: true;
      application_id: string;
      partner_id: string;
      api_key_id: string;
      key_prefix: string;
      api_key?: string;
      idempotency_replay: boolean;
    }
  | { ok: false; code: "not_found" | "invalid_state" | "approval_failed" | "conflict" | "not_configured" };

export async function approveLaunchpadProductionAccess(input: {
  requestId: string;
  reviewerNotes?: string;
}): Promise<ApproveProductionResult> {
  const sb = requireSupabaseAdmin();
  const { raw, prefix, hash } = generatePartnerKey("live");

  const { data, error } = await sb.rpc("partner_launchpad_approve_production_atomic", {
    p_request_id: input.requestId,
    p_key_prefix: prefix,
    p_key_hash: hash,
    p_reviewer_notes: input.reviewerNotes ?? null,
  });

  if (error) {
    console.error("[launchpad/production] approve rpc failed", { message: error.message });
    return { ok: false, code: "approval_failed" };
  }

  const row = data as {
    ok?: boolean;
    code?: string;
    application_id?: string;
    partner_id?: string;
    api_key_id?: string;
    key_prefix?: string;
  };

  if (!row?.ok || !row.application_id || !row.partner_id || !row.api_key_id) {
    if (row?.code === "not_found") return { ok: false, code: "not_found" };
    if (row?.code === "invalid_state") return { ok: false, code: "invalid_state" };
    if (row?.code === "conflict") return { ok: false, code: "conflict" };
    return { ok: false, code: "approval_failed" };
  }

  const idempotencyReplay = row.code === "idempotency_replay";

  if (!idempotencyReplay && raw) {
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

  return {
    ok: true,
    idempotency_replay: idempotencyReplay,
    application_id: row.application_id,
    partner_id: row.partner_id,
    api_key_id: row.api_key_id,
    key_prefix: row.key_prefix ?? prefix,
  };
}

export async function rejectLaunchpadProductionAccess(input: {
  requestId: string;
  reviewerNotes?: string;
}): Promise<{ ok: true } | { ok: false; code: "not_found" | "invalid_state" | "reject_failed" }> {
  const sb = requireSupabaseAdmin();
  const { data: requestRow } = await sb
    .from("partner_production_access_requests")
    .select("id, application_id, partner_id, status")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!requestRow) return { ok: false, code: "not_found" };
  if (requestRow.status !== "pending") return { ok: false, code: "invalid_state" };

  const { error } = await sb
    .from("partner_production_access_requests")
    .update({
      status: "rejected",
      reviewer_notes: input.reviewerNotes?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);

  if (error) return { ok: false, code: "reject_failed" };

  await recordLaunchpadActivity(sb, {
    applicationId: requestRow.application_id,
    partnerId: requestRow.partner_id,
    eventType: "production_access_rejected",
    publicCode: "rejected",
    metadata: { request_id: input.requestId },
  });

  return { ok: true };
}

export async function revealProductionCredentialOnce(
  applicationId: string,
  partnerId: string,
): Promise<
  | { ok: true; api_key: string; key_prefix: string }
  | { ok: true; already_revealed: true }
  | { ok: false; code: "not_found" | "not_ready" | "reveal_failed" | "not_configured" }
> {
  const sb = requireSupabaseAdmin();
  const { data: app } = await sb
    .from("partner_launchpad_applications")
    .select("id, partner_id, production_api_key_id, production_key_revealed_at, production_key_encrypted")
    .eq("id", applicationId)
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (!app || !app.production_api_key_id) {
    return { ok: false, code: "not_ready" };
  }

  if (app.production_key_revealed_at) {
    return { ok: true, already_revealed: true };
  }

  const encrypted = app.production_key_encrypted as string | null;
  if (!encrypted) {
    return { ok: false, code: "not_ready" };
  }

  const apiKey = decryptProductionKeyForReveal(applicationId, encrypted);
  if (!apiKey) {
    return { ok: false, code: "not_configured" };
  }

  const { error } = await sb
    .from("partner_launchpad_applications")
    .update({
      production_key_revealed_at: new Date().toISOString(),
      production_key_encrypted: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("partner_id", partnerId)
    .is("production_key_revealed_at", null);

  if (error) {
    return { ok: false, code: "reveal_failed" };
  }

  const { data: key } = await sb
    .from("partner_api_keys")
    .select("key_prefix")
    .eq("id", app.production_api_key_id)
    .maybeSingle();

  return {
    ok: true,
    api_key: apiKey,
    key_prefix: key?.key_prefix ?? apiKey.slice(0, 16),
  };
}
