// FILE: app/api/idv/sync-decision/route.ts
// Poll Veriff when webhook is slow or missed. POST can attach a missing session id.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { processVeriffDecision } from "@/lib/idv/processVeriffDecision";
import { parseVeriffDecisionPayload } from "@/lib/idv/veriffDecision";
import { requireBrowserSession } from "@/lib/auth/browserSession";

const VERIFF_KEY = process.env.VERIFF_API_KEY ?? "";
const VERIFF_BASE = "https://stationapi.veriff.com/v1";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function loadRow(sui: string) {
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("identity_verifications")
    .select("status, veriff_session_id, credential_jti, user_email")
    .or(`sui_address.eq.${sui},wallet_address.eq.${sui}`)
    .maybeSingle();
  return data;
}

async function syncDecisionForSui(
  sui: string,
  attachSessionId?: string,
) {
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ status: "not_started", dev_mode: true });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  let row = await loadRow(sui);

  if (!row) {
    return NextResponse.json({ status: "not_started", message: "No verification row for this address" });
  }

  if (attachSessionId) {
    await sb.from("identity_verifications").update({
      veriff_session_id: attachSessionId,
      status: row.status === "approved" ? "approved" : "pending",
      updated_at: new Date().toISOString(),
    }).or(`sui_address.eq.${sui},wallet_address.eq.${sui}`);
    row = await loadRow(sui);
  }

  if (row?.status === "approved") {
    return NextResponse.json({
      status: "approved",
      credential_jti: row.credential_jti,
      synced: false,
      message: "Already approved in Supabase",
    });
  }

  const sessionId = row?.veriff_session_id;
  if (!sessionId) {
    return NextResponse.json({
      status: "pending",
      message: "No Veriff session id saved. Start Precheck again (server session) or POST session_id here.",
      hint: "Redeploy latest /passport and click Start Precheck again",
    });
  }

  if (!VERIFF_KEY) {
    return NextResponse.json({
      status: row?.status ?? "pending",
      veriff_session_id: sessionId,
      message: "VERIFF_API_KEY not configured on server",
    });
  }

  const res = await fetch(`${VERIFF_BASE}/sessions/${sessionId}/decision`, {
    headers: { "X-AUTH-CLIENT": VERIFF_KEY },
    cache: "no-store",
  });

  const raw = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    return NextResponse.json({
      status: "pending",
      veriff_session_id: sessionId,
      veriff_http: res.status,
      veriff_error: raw.status ?? raw.message ?? "decision fetch failed",
    });
  }

  const parsed = parseVeriffDecisionPayload(raw, sessionId);
  if (!parsed) {
    return NextResponse.json({
      status: "pending",
      veriff_session_id: sessionId,
      message: "Veriff still processing (decision not ready). Try again in 30 seconds.",
      veriff_api_status: raw.status,
    });
  }

  if (parsed.status === "unknown") {
    return NextResponse.json({
      status: "declined",
      synced: false,
      message: "Veriff session expired or abandoned. Start Precheck again.",
    });
  }

  if (parsed.status === "pending") {
    return NextResponse.json({
      status: "pending",
      veriff_session_id: sessionId,
      message: "Still in review at Veriff",
    });
  }

  const result = await processVeriffDecision(
    {
      id: parsed.sessionId,
      status: parsed.status,
      vendorData: parsed.vendorData ?? `sui:${sui}`,
      person: parsed.person,
      document: parsed.document,
    },
    sui,
  );

  return NextResponse.json({
    status: result.status,
    synced: result.status === "approved" || result.status === "declined",
    credential_jti: result.jti,
    message: result.message,
    veriff_session_id: sessionId,
    veriff_decision: parsed.status,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const raw = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("sui_address");
  if (raw) {
    try {
      if (normalizeSuiAddress(raw) !== auth.session.suiAddress) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid sui param" }, { status: 400 });
    }
  }

  return syncDecisionForSui(auth.session.suiAddress);
}

export async function POST(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    sui_address?: string;
    sui?: string;
    session_id?: string;
  };
  const raw = body.sui_address ?? body.sui;
  if (raw) {
    try {
      if (normalizeSuiAddress(raw) !== auth.session.suiAddress) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid sui_address" }, { status: 400 });
    }
  }

  return syncDecisionForSui(auth.session.suiAddress, body.session_id?.trim());
}
