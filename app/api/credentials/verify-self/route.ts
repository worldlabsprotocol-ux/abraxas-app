// FILE: app/api/credentials/verify-self/route.ts
// Server-side credential check for the passport UI — no JWT paste required.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCredentialJwt } from "@/lib/credentials/verifyJwt";
import type { VerificationResult } from "@/lib/credentials/types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest): Promise<NextResponse<VerificationResult>> {
  const sui = req.nextUrl.searchParams.get("sui");
  if (!sui) {
    return NextResponse.json({ verified: false, error: "sui param required" }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ verified: false, error: "DB not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("abraxas_credentials")
    .select("credential_jwt, revoked_at, expiration_date, sui_address, holder_wallet")
    .or(`sui_address.eq.${sui},holder_wallet.eq.${sui}`)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.credential_jwt) {
    return NextResponse.json({ verified: false, error: "No active credential for this address" });
  }

  if (new Date(data.expiration_date) < new Date()) {
    return NextResponse.json({ verified: false, error: "Credential expired" });
  }

  const result = await verifyCredentialJwt(
    data.credential_jwt,
    "passport-ui-auto",
    [],
    false,
  );

  return NextResponse.json(result);
}
