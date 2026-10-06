import { describe, expect, it } from "vitest";
import { assertContinuationMatchesStored } from "@/lib/partner/partnerFlowContinuation";
import { parsePartnerFlowInstant, canonicalPartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";
import type { PartnerFlowContinuationRecord } from "@/lib/partner/partnerFlowContinuation";
import type { HostedHandoffRecord } from "./types";

/** Exact PostgREST row shape observed live for vr_33a7a87174674ca6 after resolve #1. */
const PROD_POSTGREST_ROW = {
  jti: "c2cbe8c6-a5a4-40ac-a31f-d728a828cd19",
  partner_id: "ref-wc-postrev-5ffe",
  policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
  policy_version: 1,
  return_url: "https://example.com/callback",
  permission: null,
  permission_version: null,
  purpose: "Confirm you control an eligible wallet",
  app_slug: "ref-wc-postrev-proof",
  created_at: "2026-10-05 11:44:18.953+00",
  expires_at: "2026-10-05 11:59:13.776+00",
  consumed_at: null,
  opaque_verify_request: "vr_33a7a87174674ca6",
  verify_request_id: null,
};

function mapRowLikeProduction(row: Record<string, unknown>): PartnerFlowContinuationRecord {
  const rawExpires = String(row.expires_at ?? "");
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
    expiresAt: canonicalPartnerFlowInstant(rawExpires) ?? rawExpires,
    consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    verifyRequestId: typeof row.opaque_verify_request === "string" && row.opaque_verify_request.trim()
      ? row.opaque_verify_request.trim()
      : null,
  };
}

function hostedHandoffContinuationExpired(record: PartnerFlowContinuationRecord, now = Date.now()): boolean {
  const expires = parsePartnerFlowInstant(record.expiresAt);
  if (expires === null) return true;
  return expires <= now;
}

describe("production forensic simulation vr_33a7a87174674ca6", () => {
  it("traces mapRow → reuse checks with live row shape", () => {
    const mapped = mapRowLikeProduction(PROD_POSTGREST_ROW);
    const handoff: HostedHandoffRecord = {
      id: "handoff-id",
      handoff_ref: "hpf_e8ddf542793178c3",
      verify_request: "vr_33a7a87174674ca6",
      application_id: "8d30e3b1-3409-4bef-8d04-66335f38e96e",
      partner_id: "ref-wc-postrev-5ffe",
      policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
      policy_version: 1,
      binding_id: "primary:8d30e3b1-3409-4bef-8d04-66335f38e96e",
      pack_id: "wallet_control",
      result_family: "wallet_control_confirmed",
      action: "wallet_bound_action",
      purpose: "Confirm you control an eligible wallet",
      callback_ref: "b02a1b7fa0fb",
      runtime: "universal_https",
      environment: "sandbox",
      status: "created",
      nonce_hash: "nonce",
      issued_at: "2026-10-05T11:44:13.776Z",
      expires_at: canonicalPartnerFlowInstant("2026-10-05 11:59:13.776+00") ?? "2026-10-05 11:59:13.776+00",
      consumed_at: null,
      public_receipt_id: null,
      fixture: false,
    };
    const returnUrl = "https://example.com/callback";
    const now = Date.parse("2026-10-05T11:45:00.000Z");

    const rawExpires = String(PROD_POSTGREST_ROW.expires_at);
    const parsedEpoch = parsePartnerFlowInstant(mapped.expiresAt);
    const expired = hostedHandoffContinuationExpired(mapped, now);
    const binding = assertContinuationMatchesStored({
      stored: mapped,
      partnerId: handoff.partner_id,
      policyId: handoff.policy_id,
      returnUrl,
      policyVersion: handoff.policy_version,
    });

    expect({
      rawDbExpiresAt: rawExpires,
      mappedExpiresAt: mapped.expiresAt,
      parsedEpoch,
      nowEpoch: now,
      expired,
      binding,
      consumed: Boolean(mapped.consumedAt),
    }).toEqual({
      rawDbExpiresAt: "2026-10-05 11:59:13.776+00",
      mappedExpiresAt: "2026-10-05T11:59:13.776Z",
      parsedEpoch: Date.parse("2026-10-05T11:59:13.776Z"),
      nowEpoch: now,
      expired: false,
      binding: { ok: true },
      consumed: false,
    });
  });
});
