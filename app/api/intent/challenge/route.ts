// FILE: app/api/intent/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { randomUUID } from "crypto";
import { buildIntentMessage } from "@/lib/sui/intent/personalMessage";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { sui_address?: string };
  const raw = body.sui_address;
  if (!raw) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const sui = normalizeSuiAddress(raw);
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: verified } = await sb
    .from("identity_verifications")
    .select("status")
    .or(`sui_address.eq.${sui},wallet_address.eq.${sui}`)
    .eq("status", "approved")
    .maybeSingle();

  if (!verified) {
    return NextResponse.json({ error: "Complete identity verification first" }, { status: 403 });
  }

  const nonce = randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const message = buildIntentMessage(sui, nonce, issuedAt);

  const { data, error } = await sb
    .from("intent_challenges")
    .insert({
      sui_address: sui,
      message,
      expires_at: expiresAt,
    })
    .select("id, message, expires_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create challenge" }, { status: 500 });
  }

  return NextResponse.json({
    challenge_id: data.id,
    message: data.message,
    expires_at: data.expires_at,
    sui_address: sui,
  });
}
