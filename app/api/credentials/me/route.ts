// FILE: app/api/credentials/me/route.ts
// Fetch the active Abraxas credential for the signed-in holder (Passport dashboard).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireBrowserSession } from "@/lib/auth/browserSession";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sui = auth.session.suiAddress;
  const requested = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("sui_address");
  if (requested) {
    try {
      if (normalizeSuiAddress(requested) !== sui) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid sui query param" }, { status: 400 });
    }
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const supabase = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: verification } = await supabase
    .from("identity_verifications")
    .select("status, credential_jti, document_type, document_country, liveness_provider, liveness_passed")
    .or(`wallet_address.eq.${sui},sui_address.eq.${sui}`)
    .maybeSingle();

  if (!verification || verification.status !== "approved") {
    return NextResponse.json({
      verified: false,
      status: verification?.status ?? "not_found",
    });
  }

  if (!verification.credential_jti) {
    return NextResponse.json({
      verified: false,
      status: "approved",
      message: "Verification approved — credential issuance pending",
    });
  }

  const { data: cred } = await supabase
    .from("abraxas_credentials")
    .select("jti, jurisdiction, document_type, verification_level, issuance_date, expiration_date, credential_jwt, revoked_at, sui_address, holder_wallet")
    .eq("jti", verification.credential_jti)
    .maybeSingle();

  if (!cred || cred.revoked_at) {
    return NextResponse.json({ verified: false, status: "revoked_or_missing" });
  }

  if (new Date(cred.expiration_date) < new Date()) {
    return NextResponse.json({ verified: false, status: "expired" });
  }

  const credential_hash = createHash("sha256").update(cred.credential_jwt).digest("hex");

  return NextResponse.json({
    verified: true,
    status: "active",
    sui_address: sui,
    credential_jti: cred.jti,
    credential_jwt: cred.credential_jwt,
    credential_hash,
    issuer: process.env.ABRAXAS_ISSUER_URL ?? "https://abraxas-app.vercel.app",
    jurisdiction: cred.jurisdiction,
    document_type: cred.document_type,
    verification_level: cred.verification_level,
    liveness_passed: verification.liveness_passed ?? true,
    sanctions_status: "clear",
    issued_at: cred.issuance_date,
    expires_at: cred.expiration_date,
    via: verification.liveness_provider ?? "veriff",
  });
}
