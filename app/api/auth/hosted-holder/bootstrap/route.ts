// FILE: app/api/auth/hosted-holder/bootstrap/route.ts
// Mint or reuse an Abraxas-native hosted holder session for eligible partner flows.

import { NextRequest, NextResponse } from "next/server";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";
import {
  attachHostedHolderBrowserSession,
  createHostedHolderIdentity,
  HOSTED_HOLDER_PROVIDER,
  resolveExistingBootstrapBrowserSession,
} from "@/lib/auth/hostedHolderSession";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureHostedHolderWalletBinding } from "@/lib/credentials/ensureHostedHolderWalletBinding";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

function bootstrapSuccessResponse(input: {
  suiAddress: string;
  sessionKind: "hosted" | "oauth";
  provider: string;
  reused: boolean;
}): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      sui_address: input.suiAddress,
      session_kind: input.sessionKind,
      provider: input.provider,
      reused: input.reused,
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(req: NextRequest) {
  let body: {
    partner_id?: string;
    relying_party_id?: string;
    policy_id?: string;
    return_url?: string;
    purpose?: string;
    verify_request?: string;
    sui_address?: string;
    suiAddress?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  // Client-provided identity hints are ignored — recovery is cookie-only.
  if (body.sui_address?.trim() || body.suiAddress?.trim()) {
    return NextResponse.json(
      { error: "Client-provided identity is not accepted", code: "client_identity_rejected" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let partnerId = (body.relying_party_id ?? body.partner_id ?? "").trim();
  let policyId = (body.policy_id ?? "").trim();
  let returnUrl = (body.return_url ?? "").trim();
  const purpose = body.purpose?.trim() || undefined;
  const verifyRequest = body.verify_request?.trim() || undefined;

  if (verifyRequest) {
    try {
      const sb = requireSupabaseAdmin();
      const { data } = await sb
        .from("verification_requests")
        .select("partner_id, policy_id, return_url, purpose, status, expires_at")
        .eq("request_id", verifyRequest)
        .maybeSingle();

      if (!data) {
        return NextResponse.json({ error: "Verification request not found" }, { status: 404, headers: NO_STORE_HEADERS });
      }

      if (data.status === "cancelled" || data.status === "decided" || data.status === "expired") {
        return NextResponse.json({ error: "Verification request is no longer active" }, { status: 409, headers: NO_STORE_HEADERS });
      }

      if (data.expires_at && new Date(String(data.expires_at)) < new Date()) {
        return NextResponse.json({ error: "Verification request expired" }, { status: 409, headers: NO_STORE_HEADERS });
      }

      partnerId = String(data.partner_id);
      policyId = String(data.policy_id);
      returnUrl = String(data.return_url ?? returnUrl);
      if (!purpose && data.purpose) {
        body.purpose = String(data.purpose);
      }
    } catch {
      return NextResponse.json({ error: "Verification request lookup failed" }, { status: 503, headers: NO_STORE_HEADERS });
    }
  }

  const normalized = normalizePartnerVerifyInput({
    partnerId,
    policyId,
    returnUrl,
    purpose: body.purpose,
  });

  if (!normalized.ok) {
    return NextResponse.json(
      { error: normalized.invalidLinkMessage, code: normalized.code },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  partnerId = normalized.params.partnerId;
  policyId = normalized.params.policyId;
  returnUrl = normalized.params.returnUrl;

  if (!isHostedHolderBootstrapEligible({
    partnerId,
    policyId,
    purpose: normalized.params.purpose,
  })) {
    return NextResponse.json(
      { error: "Hosted holder bootstrap is not available for this flow", code: "hosted_bootstrap_ineligible" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const allowed = await isAllowedPartnerReturnUrl(partnerId, returnUrl);
  if (!allowed) {
    return NextResponse.json(
      { error: "return_url is not allowed for this relying party" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const existing = await resolveExistingBootstrapBrowserSession(req);
  if (existing?.kind === "hosted") {
    try {
      await ensureHostedHolderWalletBinding(existing.suiAddress);
    } catch {
      // Non-fatal — partner flow can proceed; binding may repair later for OAuth holders only.
    }
    const res = bootstrapSuccessResponse({
      suiAddress: existing.suiAddress,
      sessionKind: "hosted",
      provider: HOSTED_HOLDER_PROVIDER,
      reused: true,
    });
    await attachHostedHolderBrowserSession(res, existing.suiAddress);
    return res;
  }

  if (existing?.kind === "oauth") {
    return bootstrapSuccessResponse({
      suiAddress: existing.suiAddress,
      sessionKind: "oauth",
      provider: existing.provider,
      reused: true,
    });
  }

  try {
    const record = await createHostedHolderIdentity();
    try {
      await ensureHostedHolderWalletBinding(record.suiAddress);
    } catch {
      // Session still minted; wallet binding best-effort for hosted holders.
    }
    const res = bootstrapSuccessResponse({
      suiAddress: record.suiAddress,
      sessionKind: "hosted",
      provider: record.provider,
      reused: false,
    });

    const attached = await attachHostedHolderBrowserSession(res, record.suiAddress);
    if (!attached) {
      return NextResponse.json(
        { error: "Session signing unavailable" },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "hosted_holder_bootstrap_failed";
    const status = message === "hosted_holder_secret_unavailable" ? 503 : 500;
    return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
  }
}
