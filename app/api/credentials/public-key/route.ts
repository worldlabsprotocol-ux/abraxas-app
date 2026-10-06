// FILE: app/api/credentials/public-key/route.ts
// Publishes Abraxas's public key so ANY verifier can independently
// verify credential signatures without calling Abraxas each time.
// This is how decentralized verification works — verifiers cache this.

import { NextResponse } from "next/server";
import { getSdkDefaultBaseUrl } from "@/lib/app/publicAppOrigin";

export const dynamic = "force-dynamic";

function parseConfiguredPublicKey(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

export async function GET() {
  const pubKey = process.env.ABRAXAS_PUBLIC_KEY;
  const parsed = pubKey ? parseConfiguredPublicKey(pubKey) : null;
  if (!parsed) {
    return NextResponse.json({ error: "Public key not configured" }, { status: 503 });
  }
  return NextResponse.json({
    issuer:        getSdkDefaultBaseUrl(),
    public_key:    parsed,
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
