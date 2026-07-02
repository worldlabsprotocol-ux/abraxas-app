// FILE: app/api/zklogin/prover/route.ts
// Proxy zkLogin prover requests to avoid browser CORS issues.

import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROVING_SERVICE_URL } from "@/lib/sui/zklogin/config";
import { getZkLoginProverUrl } from "@/lib/sui/network";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const jwt = String(body.jwt ?? "");
  if (!jwt) {
    return NextResponse.json({ error: "jwt required" }, { status: 400 });
  }

  const proverUrl = getZkLoginProverUrl() || DEFAULT_PROVING_SERVICE_URL;

  try {
    const upstream = await fetch(proverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jwt,
        extendedEphemeralPublicKey: body.extendedEphemeralPublicKey,
        maxEpoch: body.maxEpoch,
        jwtRandomness: body.jwtRandomness,
        salt: body.salt,
        keyClaimName: body.keyClaimName ?? "sub",
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg =
        typeof data === "object" && data && "error" in data
          ? String((data as { error: unknown }).error)
          : `Prover returned ${upstream.status}`;
      return NextResponse.json({ error: msg }, { status: upstream.status });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[zklogin/prover]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Prover request failed" },
      { status: 502 },
    );
  }
}
