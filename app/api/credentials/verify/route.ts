// FILE: app/api/credentials/verify/route.ts
// Any protocol (Utila, Coinbase, etc.) calls this to verify an Abraxas credential.
// The verifier does NOT need to re-KYC the user.
//
// POST /api/credentials/verify
// Body: { credential_jwt: string, verifier_id: string, required_claims?: string[] }
// Returns: VerificationResult
//
// GET /api/credentials/verify?wallet=<address>
// Returns: current credential status for a wallet

import { NextRequest, NextResponse }   from "next/server";
import { jwtVerify, importJWK }        from "jose";
import { createClient }                from "@supabase/supabase-js";
import type { VerificationResult }     from "@/lib/credentials/types";

const ISSUER = process.env.ABRAXAS_ISSUER_URL      ?? "https://abraxas-app.vercel.app";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Verify a credential JWT presented by a user
export async function POST(req: NextRequest): Promise<NextResponse<VerificationResult>> {
  const body = await req.json().catch(() => ({})) as {
    credential_jwt?: string;
    verifier_id?:   string;
    required_claims?: string[];
  };

  const { credential_jwt, verifier_id = "unknown", required_claims = [] } = body;

  if (!credential_jwt) {
    return NextResponse.json({ verified: false, error: "credential_jwt required" });
  }

  // Step 1 — Get Abraxas public key (verifiers can also cache this)
  const pubKeyJson = process.env.ABRAXAS_PUBLIC_KEY;
  if (!pubKeyJson) {
    return NextResponse.json({ verified: false, error: "ABRAXAS_PUBLIC_KEY not configured" });
  }

  let publicKey;
  try {
    publicKey = await importJWK(JSON.parse(pubKeyJson), "EdDSA");
  } catch {
    return NextResponse.json({ verified: false, error: "Invalid public key configuration" });
  }

  // Step 2 — Verify JWT signature + expiration
  let payload;
  try {
    const result = await jwtVerify(credential_jwt, publicKey, { issuer: ISSUER });
    payload = result.payload;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "JWT verification failed";
    return NextResponse.json({ verified: false, error: msg });
  }

  const jti = payload.jti as string;
  const vc  = (payload as Record<string, unknown>).vc as Record<string, unknown> | undefined;
  const sub = (vc?.credentialSubject as Record<string, unknown> | undefined);

  if (!jti || !sub) {
    return NextResponse.json({ verified: false, error: "Malformed credential" });
  }

  // Step 3 — Check it hasn't been revoked in Supabase
  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data } = await sb
      .from("abraxas_credentials")
      .select("jti, revoked_at, expiration_date")
      .eq("jti", jti)
      .single();

    if (!data) {
      return NextResponse.json({ verified: false, error: "Credential not found in registry" });
    }
    if (data.revoked_at) {
      return NextResponse.json({ verified: false, error: "Credential has been revoked" });
    }
    if (new Date(data.expiration_date) < new Date()) {
      return NextResponse.json({ verified: false, error: "Credential expired" });
    }

    // Step 4 — Log this presentation (audit trail)
    await sb.from("credential_presentations").insert({
      credential_jti:   jti,
      verifier_id,
      claims_disclosed: required_claims.length ? required_claims
                          : ["jurisdiction","verification_level","world_id_verified"],
      accepted:         true,
    });
  }

  // Step 5 — Return the verified claims
  const permissions = sub.permissions as Record<string, boolean> | undefined;
  const result: VerificationResult = {
    verified:           true,
    credential_jti:     jti,
    holder_wallet:      sub.wallet as string,
    jurisdiction:       sub.jurisdiction as string,
    verification_level: sub.verification_level as "basic" | "standard" | "enhanced",
    world_id_verified:  sub.world_id_verified as boolean,
    permissions: {
      fiat_offramp:    permissions?.fiat_offramp   ?? false,
      defi_access:     permissions?.defi_access    ?? false,
      rwa_tokenize:    permissions?.rwa_tokenize   ?? false,
      cross_border:    permissions?.cross_border   ?? false,
    },
    expires_at: (vc?.expirationDate as string | undefined),
  };

  return NextResponse.json(result);
}

// Check credential status by wallet address (for dashboard display)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet param required" }, { status: 400 });

  if (!SB_URL || !SB_KEY) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("identity_verifications")
    .select("status, credential_jti, document_type, document_country, world_id_verified")
    .eq("wallet_address", wallet)
    .single();

  if (!data) return NextResponse.json({ verified: false, status: "not_found" });

  return NextResponse.json({
    verified:       data.status === "approved",
    status:         data.status,
    credential_jti: data.credential_jti,
    document_type:  data.document_type,
    jurisdiction:   data.document_country,
    world_id:       data.world_id_verified,
  });
}
