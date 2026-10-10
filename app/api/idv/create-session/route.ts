// FILE: app/api/idv/create-session/route.ts
// Creates a Veriff identity verification session.
// Returns a URL the user visits to complete their document scan + liveness.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { transitionIdentityVerification } from "@/lib/idv/identityVerificationDb";
import { getIdvProvider, isVeriffLive } from "@/lib/idv/idvProvider";
import { requireHolderRequestContext, holderClaimsSubjectKey } from "@/lib/holder/holderRequestContext";

const VERIFF_KEY = process.env.VERIFF_API_KEY ?? "";
const VERIFF_BASE = "https://stationapi.veriff.com/v1";
const APP_URL = process.env.ABRAXAS_ISSUER_URL ?? "https://abraxas-app.vercel.app";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

interface SessionBody {
  sui_address?: string;
  wallet_address?: string;
  document_type?: string;
  first_name?: string;
  last_name?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireHolderRequestContext(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  }

  const holder = holderClaimsSubjectKey(auth.ctx);
  const body: SessionBody = await req.json().catch(() => ({}));

  const requested = body.sui_address ?? body.wallet_address;
  if (requested && requested.trim() !== holder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (auth.ctx.mode === "solana_native" && !auth.ctx.walletBindingActive) {
    return NextResponse.json({
      error: "Wallet binding required before identity verification",
      code: "wallet_binding_required",
    }, { status: 403 });
  }

  const idvProvider = getIdvProvider();
  if (!isVeriffLive() || !VERIFF_KEY) {
    return NextResponse.json({
      session_id: null,
      session_url: null,
      is_mock: true,
      idv_provider: idvProvider,
      message: idvProvider === "manual"
        ? "Live Veriff is disabled — upload your ID for pilot manual review instead"
        : "VERIFF_API_KEY not configured — identity verification unavailable in this environment",
      error_code: idvProvider === "manual" ? "manual_review_mode" : "veriff_not_configured",
    }, { status: 503 });
  }

  const veriffPayload = {
    verification: {
      callback: `${APP_URL}/api/idv/callback`,
      person: {
        firstName: body.first_name ?? "",
        lastName: body.last_name ?? "",
      },
      document: {
        type: (body.document_type ?? "PASSPORT").toUpperCase(),
      },
      vendorData: `abx:${holder}`,
    },
  };

  const res = await fetch(`${VERIFF_BASE}/sessions`, {
    method: "POST",
    headers: {
      "X-AUTH-CLIENT": VERIFF_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(veriffPayload),
  });

  const data = await res.json() as {
    status?: string;
    verification?: { id: string; url: string; sessionToken: string; status: string };
  };

  if (!res.ok || data.status !== "success" || !data.verification) {
    console.error("[idv] Veriff session creation failed:", data);
    return NextResponse.json({ error: "Failed to create verification session" }, { status: 500 });
  }

  const { id: session_id, url: session_url } = data.verification;

  if (SB_URL && SB_SERVICE) {
    const sb = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
    let userEmail: string | null = null;
    if (auth.ctx.mode === "legacy_sui") {
      const { data: zkRow } = await sb
        .from("sui_zklogin_identities")
        .select("email")
        .eq("sui_address", holder)
        .maybeSingle();
      if (zkRow?.email) userEmail = zkRow.email;
    }

    await transitionIdentityVerification(
      holder,
      {
        user_email: userEmail,
        veriff_session_id: session_id,
        status: "pending",
        identity_verification_status: "session_created",
        credential_status: "not_issued",
        liveness_provider: "veriff",
        error_message: null,
        holder_account_id:
          auth.ctx.mode === "solana_native" ? auth.ctx.holderAccountId : null,
      },
      "create_session",
    );
  }

  return NextResponse.json({ session_id, session_url, is_mock: false });
}
