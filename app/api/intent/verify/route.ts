// FILE: app/api/intent/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyIntentSignature } from "@/lib/sui/intent/personalMessage";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    challenge_id?: string;
    signature?: string;
    public_key?: string;
  };

  const { challenge_id, signature, public_key } = body;
  if (!challenge_id || !signature || !public_key) {
    return NextResponse.json({ error: "challenge_id, signature, public_key required" }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: challenge } = await sb
    .from("intent_challenges")
    .select("*")
    .eq("id", challenge_id)
    .maybeSingle();

  if (!challenge) {
    return NextResponse.json({ verified: false, error: "Challenge not found" });
  }

  if (challenge.consumed_at) {
    return NextResponse.json({ verified: false, error: "Challenge already used" });
  }

  if (new Date(challenge.expires_at) < new Date()) {
    return NextResponse.json({ verified: false, error: "Challenge expired" });
  }

  const valid = verifyIntentSignature(challenge.message, signature, public_key);
  if (!valid) {
    return NextResponse.json({ verified: false, error: "Invalid signature" });
  }

  await sb.from("intent_challenges").update({
    consumed_at: new Date().toISOString(),
    signature_b64: signature,
    public_key_b64: public_key,
    verified: true,
  }).eq("id", challenge_id);

  return NextResponse.json({
    verified: true,
    sui_address: challenge.sui_address,
    message: challenge.message,
  });
}
