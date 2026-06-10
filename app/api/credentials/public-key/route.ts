// FILE: app/api/credentials/public-key/route.ts
// Publishes Abraxas's public key so ANY verifier can independently
// verify credential signatures without calling Abraxas each time.
// This is how decentralized verification works — verifiers cache this.

import { NextResponse } from "next/server";

export async function GET() {
  const pubKey = process.env.ABRAXAS_PUBLIC_KEY;
  if (!pubKey) {
    return NextResponse.json({ error: "Public key not configured" }, { status: 500 });
  }
  return NextResponse.json({
    issuer:        "https://abraxas-app.vercel.app",
    public_key:    JSON.parse(pubKey),
    algorithm:     "EdDSA",
    standard:      "W3C VC Data Model v2.0",
    updated_at:    new Date().toISOString(),
  }, {
    headers: {
      // Cache for 1 hour — verifiers don't need to re-fetch every request
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",   // allow any protocol to fetch this
    },
  });
}
