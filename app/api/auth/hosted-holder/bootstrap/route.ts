// FILE: app/api/auth/hosted-holder/bootstrap/route.ts
// Confirm a signed Solana holder session for an eligible hosted request.

import { NextRequest, NextResponse } from "next/server";
import { resolveBrowserSession } from "@/lib/auth/browserSession";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isOpaqueVerifyRequest } from "@/lib/partner/partnerFlowContinuationIdentifiers";
import { resolveHostedHandoffForContinue } from "@/lib/partner/hostedHandoff/resolveForContinue";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const session = await resolveBrowserSession(req);
  if (session?.authMethod !== "solana_wallet" || !session.holderSubjectId || !session.walletCaip10) {
    return NextResponse.json({ ok: false, code: "holder_sign_in_required" }, { status: 401, headers: HEADERS });
  }

  let body: {
    partner_id?: string;
    relying_party_id?: string;
    policy_id?: string;
    return_url?: string;
    purpose?: string;
    verify_request?: string;
    sui_address?: string;
    suiAddress?: string;
    holder_subject_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json" }, { status: 400, headers: HEADERS });
  }
  if (body.sui_address || body.suiAddress || body.holder_subject_id) {
    return NextResponse.json({ ok: false, code: "client_identity_rejected" }, { status: 400, headers: HEADERS });
  }

  let partnerId = (body.relying_party_id ?? body.partner_id ?? "").trim();
  let policyId = (body.policy_id ?? "").trim();
  let returnUrl = (body.return_url ?? "").trim();
  const verifyRequest = body.verify_request?.trim();
  if (verifyRequest && isOpaqueVerifyRequest(verifyRequest)) {
    const resolved = await resolveHostedHandoffForContinue(verifyRequest);
    if (!resolved.ok) {
      const status = resolved.code === "expired" ? 410
        : resolved.code === "completed" || resolved.code === "cancelled" ? 409
          : resolved.code === "unavailable" ? 503 : 404;
      return NextResponse.json({ ok: false, code: resolved.code }, { status, headers: HEADERS });
    }
    partnerId = resolved.preview.partner_id;
    policyId = resolved.preview.policy_id;
    returnUrl = resolved.preview.return_url;
    body.purpose = resolved.preview.purpose ?? "";
  } else if (verifyRequest) {
    try {
      const sb = requireSupabaseAdmin();
      const { data, error } = await sb.from("verification_requests")
        .select("partner_id, policy_id, return_url, purpose, status, expires_at, subject_id, sui_address")
        .eq("id", verifyRequest).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ ok: false, code: "request_not_found" }, { status: 404, headers: HEADERS });
      const expires = Date.parse(String(data.expires_at ?? ""));
      if (!Number.isFinite(expires) || expires <= Date.now()) {
        return NextResponse.json({ ok: false, code: "request_expired" }, { status: 410, headers: HEADERS });
      }
      if (data.status !== "pending" && data.status !== "consented") {
        return NextResponse.json({ ok: false, code: "request_consumed" }, { status: 409, headers: HEADERS });
      }
      if (data.sui_address || (data.subject_id && data.subject_id !== session.holderSubjectId)) {
        return NextResponse.json({ ok: false, code: "holder_mismatch" }, { status: 403, headers: HEADERS });
      }
      partnerId = String(data.partner_id);
      policyId = String(data.policy_id);
      returnUrl = String(data.return_url ?? "");
      body.purpose = String(data.purpose ?? "");
    } catch {
      return NextResponse.json({ ok: false, code: "request_unavailable" }, { status: 503, headers: HEADERS });
    }
  }

  const normalized = normalizePartnerVerifyInput({ partnerId, policyId, returnUrl, purpose: body.purpose });
  if (!normalized.ok) {
    return NextResponse.json({ ok: false, code: normalized.code }, { status: 400, headers: HEADERS });
  }
  if (!isHostedHolderBootstrapEligible({
    partnerId: normalized.params.partnerId,
    policyId: normalized.params.policyId,
    purpose: normalized.params.purpose,
  })) {
    return NextResponse.json({ ok: false, code: "hosted_bootstrap_ineligible" }, { status: 403, headers: HEADERS });
  }
  if (!await isAllowedPartnerReturnUrl(normalized.params.partnerId, normalized.params.returnUrl)) {
    return NextResponse.json({ ok: false, code: "return_url_rejected" }, { status: 400, headers: HEADERS });
  }

  return NextResponse.json({ ok: true, holder_subject_id: session.holderSubjectId, session_kind: "solana_wallet" },
    { headers: HEADERS });
}
