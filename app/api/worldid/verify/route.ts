// FILE: app/api/worldid/verify/route.ts
// Backend verification for World ID ZK proofs.
// World ID verifies the proof server-side to prevent replay attacks.

import { NextRequest, NextResponse } from "next/server";

const APP_ID  = process.env.NEXT_PUBLIC_WORLDID_APP_ID  ?? "";
const ACTION  = process.env.NEXT_PUBLIC_WORLDID_ACTION  ?? "abraxas-verify-identity";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.proof) {
    return NextResponse.json({ message: "Missing proof" }, { status: 400 });
  }
  if (!APP_ID) {
    return NextResponse.json({ message: "App not configured" }, { status: 500 });
  }

  const { proof, signal = "0x0" } = body;

  // Forward proof to World ID developer API for on-chain verification
  const wldRes = await fetch(
    `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nullifier_hash:      proof.nullifier_hash,
        merkle_root:         proof.merkle_root,
        proof:               proof.proof,
        verification_level:  proof.verification_level,
        action:              ACTION,
        signal,
      }),
    }
  );

  const data = await wldRes.json();
  if (!wldRes.ok) {
    console.error("[WorldID] verify failed:", data);
    return NextResponse.json(
      { message: data.detail ?? "Verification failed" },
      { status: 400 }
    );
  }

  // Optionally: store nullifier_hash in Supabase to prevent double-use
  // const sb = getServiceRoleSupabase();
  // await sb.from("worldid_nullifiers").insert({ nullifier: proof.nullifier_hash });

  return NextResponse.json({
    verified:       true,
    nullifier_hash: proof.nullifier_hash,
  });
}
