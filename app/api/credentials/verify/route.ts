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
import { createClient }                from "@supabase/supabase-js";
import type { VerificationResult }     from "@/lib/credentials/types";
import { verifyCredentialJwt }         from "@/lib/credentials/verifyJwt";

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

  const result = await verifyCredentialJwt(
    credential_jwt ?? "",
    verifier_id,
    required_claims,
    true,
  );

  return NextResponse.json(result);
}

// Check credential status by Sui address (for dashboard display)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("wallet");
  if (!address) return NextResponse.json({ error: "sui or wallet param required" }, { status: 400 });

  if (!SB_URL || !SB_KEY) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("identity_verifications")
    .select("status, credential_jti, document_type, document_country, world_id_verified")
    .or(`wallet_address.eq.${address},sui_address.eq.${address}`)
    .maybeSingle();

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
