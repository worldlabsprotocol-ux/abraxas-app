// FILE: app/api/auth/zklogin/register/route.ts
// Register or fetch a zkLogin Sui address for an OAuth subject.
// Server stores the user salt — required for deterministic address derivation.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtToAddress } from "@mysten/sui/zklogin";
import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { walletBindingClaim } from "@/lib/credentials/claimSchema";
import { upsertClaims, upsertWalletBinding } from "@/lib/credentials/claimsService";
import { verifyGoogleZkLoginIdToken } from "@/lib/auth/verifyZkLoginIdToken";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function generateUserSalt(): string {
  const hex = randomBytes(16).toString("hex");
  return BigInt(`0x${hex}`).toString();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    id_token?: string;
    provider?: string;
    oauth_sub?: string;
    max_epoch?: number;
  };

  if (!body.id_token || !body.oauth_sub) {
    return NextResponse.json({ error: "id_token and oauth_sub required" }, { status: 400 });
  }

  let verified;
  try {
    verified = await verifyGoogleZkLoginIdToken(body.id_token, body.oauth_sub);
  } catch {
    return NextResponse.json({ error: "Invalid id_token" }, { status: 401 });
  }

  const sub = verified.sub;

  if (!SB_URL || !SB_KEY) {
    // Dev fallback: derive with ephemeral salt (not persistent across restarts)
    const salt = generateUserSalt();
    const sui_address = jwtToAddress(body.id_token, salt);
    return NextResponse.json({
      sui_address,
      user_salt: salt,
      provider: body.provider ?? "google",
      oauth_sub: body.oauth_sub,
      dev_mode: true,
      message: "Supabase not configured — salt not persisted",
    });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: existing } = await sb
    .from("sui_zklogin_identities")
    .select("sui_address, user_salt, email")
    .eq("oauth_sub", body.oauth_sub)
    .maybeSingle();

  const jwtEmail = verified.email;
  const emailFromJwt = typeof jwtEmail === "string" ? jwtEmail : null;

  if (existing?.sui_address && existing?.user_salt) {
    if (emailFromJwt) {
      await sb.from("sui_zklogin_identities")
        .update({ email: emailFromJwt, updated_at: new Date().toISOString() })
        .eq("oauth_sub", body.oauth_sub);
    }
    return NextResponse.json({
      sui_address: existing.sui_address,
      user_salt: existing.user_salt,
      provider: body.provider ?? "google",
      oauth_sub: body.oauth_sub,
      email: emailFromJwt ?? existing.email,
    });
  }

  const user_salt = generateUserSalt();
  const sui_address = jwtToAddress(body.id_token, user_salt);
  const email = emailFromJwt;

  const { error } = await sb.from("sui_zklogin_identities").upsert({
    oauth_sub: body.oauth_sub,
    provider: body.provider ?? "google",
    sui_address,
    user_salt,
    email,
    max_epoch: body.max_epoch ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "oauth_sub" });

  if (error) {
    console.error("[zklogin/register]", error);
    return NextResponse.json({ error: "Failed to save identity" }, { status: 500 });
  }

  try {
    const normalized = normalizeSuiAddress(sui_address);
    await upsertWalletBinding(normalized, normalized, "zklogin");
    await upsertClaims([walletBindingClaim({ subjectId: normalized, walletAddress: normalized })]);
  } catch (e) {
    console.warn("[zklogin/register] wallet binding claim skipped:", e);
  }

  return NextResponse.json({
    sui_address,
    user_salt,
    provider: body.provider ?? "google",
    oauth_sub: body.oauth_sub,
    email,
  });
}
