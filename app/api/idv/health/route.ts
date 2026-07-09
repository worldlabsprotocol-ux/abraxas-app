// FILE: app/api/idv/health/route.ts
// Operator diagnostic for Veriff + Supabase wiring.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSponsorConfig, isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";

export const dynamic = "force-dynamic";

export async function GET() {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let dbOk = false;
  let hasVeriffColumn = false;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("identity_verifications").select("id").limit(1);
    dbOk = !error;

    const { error: colErr } = await sb.from("identity_verifications").select("veriff_session_id").limit(1);
    hasVeriffColumn = !colErr;
  }

  const sponsor = getSponsorConfig();

  return NextResponse.json({
    veriff_api_key: Boolean(process.env.VERIFF_API_KEY),
    veriff_secret: Boolean(process.env.VERIFF_SECRET),
    abraxas_signing_key: Boolean(process.env.ABRAXAS_SIGNING_KEY),
    abraxas_public_key: Boolean(process.env.ABRAXAS_PUBLIC_KEY),
    supabase_configured: Boolean(SB_URL && SB_KEY),
    supabase_reachable: dbOk,
    veriff_session_column: hasVeriffColumn,
    sponsor: {
      configured: isPassportIssuerConfigured(),
      address: sponsor.sponsor_address,
      cap_from_env: sponsor.cap_from_env,
    },
    endpoints: {
      create_session: "POST /api/idv/create-session",
      sync_decision: "GET /api/idv/sync-decision?sui=0x…",
      trust_status: "GET /api/trust/status?sui=0x…",
      webhook: "POST /api/idv/webhook",
    },
  });
}
