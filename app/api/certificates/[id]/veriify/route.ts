// FILE: app/api/certificates/[id]/verify/route.ts
// Public certificate verification endpoint — no auth required.
// External lenders, auditors, and users call this to independently verify.
// Returns structured JSON with signature, provenance root, custody ref.
import { NextRequest, NextResponse } from "next/server";
import { verifyCertificate }         from "@/lib/services/assetService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error:"Certificate ID required" }, { status:400 });

  const result = await verifyCertificate(id);

  if (!result) {
    return NextResponse.json({
      valid:  false,
      error:  "Certificate not found",
      certId: id,
    }, { status:404 });
  }

  // Add verification metadata
  return NextResponse.json({
    ...result,
    verifiedAt:   new Date().toISOString(),
    verifiedBy:   "Abraxas Protocol v4.1",
    networkCheck: "Solana Mainnet",
    docs:         "https://docs.abraxas.xyz/certificates",
  }, {
    headers: {
      "Cache-Control":                 "no-store",
      "X-Abraxas-Version":             "4.1",
      "Access-Control-Allow-Origin":   "*",   // public endpoint
    },
  });
}