// FILE: app/api/idv/sync-decision/route.ts
// Poll Veriff when webhook is slow or missed — unblocks "in review" stuck state.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { processVeriffDecision } from "@/lib/idv/processVeriffDecision";

const VERIFF_KEY = process.env.VERIFF_API_KEY ?? "";
const VERIFF_BASE = "https://stationapi.veriff.com/v1";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("sui_address");
  if (!raw) {
    return NextResponse.json({ error: "sui param required" }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ status: "not_started", dev_mode: true });
  }

  const sui = normalizeSuiAddress(raw);
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: row } = await sb
    .from("identity_verifications")
    .select("status, veriff_session_id, credential_jti")
    .or(`sui_address.eq.${sui},wallet_address.eq.${sui}`)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ status: "not_started" });
  }

  if (row.status === "approved") {
    return NextResponse.json({ status: "approved", credential_jti: row.credential_jti, synced: false });
  }

  if (!row.veriff_session_id || !VERIFF_KEY) {
    return NextResponse.json({
      status: row.status ?? "pending",
      message: row.veriff_session_id
        ? "VERIFF_API_KEY not configured for polling"
        : "No Veriff session id on file yet",
    });
  }

  const res = await fetch(`${VERIFF_BASE}/sessions/${row.veriff_session_id}/decision`, {
    headers: { "X-AUTH-CLIENT": VERIFF_KEY },
  });

  const data = await res.json() as {
    status?: string;
    verification?: {
      id?: string;
      status?: string;
      vendorData?: string;
      person?: Record<string, unknown>;
      document?: { type?: string; country?: string; state?: string };
    } | null;
  };

  if (!res.ok) {
    return NextResponse.json({
      status: "pending",
      veriff_error: data.status ?? "decision fetch failed",
    });
  }

  const verification = data.verification;
  if (!verification?.status) {
    return NextResponse.json({
      status: "pending",
      veriff_session_id: row.veriff_session_id,
      message: "Veriff decision not ready yet — still processing",
    });
  }

  const result = await processVeriffDecision({
    id: verification.id ?? row.veriff_session_id,
    status: verification.status,
    vendorData: verification.vendorData,
    person: verification.person as { firstName?: string; lastName?: string; nationality?: string } | undefined,
    document: verification.document,
  });

  return NextResponse.json({
    status: result.status,
    synced: result.status === "approved" || result.status === "declined",
    credential_jti: result.jti,
    message: result.message,
  });
}
