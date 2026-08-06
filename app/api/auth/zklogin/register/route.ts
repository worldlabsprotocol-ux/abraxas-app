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
import {
  classifyGoogleAudience,
  isBrowserLegacyRecoveryAvailable,
  type ZkLoginLoginMode,
} from "@/lib/sui/zklogin/audienceCohorts";
import {
  buildZkLoginRecoveryAuditMetadata,
} from "@/lib/sui/zklogin/recoveryAudit";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function generateUserSalt(): string {
  const hex = randomBytes(16).toString("hex");
  return BigInt(`0x${hex}`).toString();
}

function parseLoginMode(raw: unknown): ZkLoginLoginMode {
  return raw === "legacy_recovery" ? "legacy_recovery" : "canonical";
}

function logRecoveryAudit(
  loginMode: ZkLoginLoginMode,
  audienceCohort: ReturnType<typeof classifyGoogleAudience>,
  outcome: "success" | "audience_mismatch" | "no_existing_account",
) {
  console.info(
    "[zklogin/register]",
    buildZkLoginRecoveryAuditMetadata({ loginMode, audienceCohort, outcome }),
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    id_token?: string;
    provider?: string;
    oauth_sub?: string;
    max_epoch?: number;
    login_mode?: string;
  };

  if (!body.id_token || !body.oauth_sub) {
    return NextResponse.json({ error: "id_token and oauth_sub required" }, { status: 400 });
  }

  const loginMode = parseLoginMode(body.login_mode);

  let verified;
  try {
    verified = await verifyGoogleZkLoginIdToken(body.id_token, body.oauth_sub);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid id_token";
    if (msg === "untrusted_oauth_audience") {
      return NextResponse.json({ error: "Invalid id_token audience", code: "zklogin_untrusted_audience" }, { status: 401 });
    }
    return NextResponse.json({ error: "Invalid id_token" }, { status: 401 });
  }

  const sub = verified.sub;
  const audienceCohort = classifyGoogleAudience(verified.aud);

  if (loginMode === "legacy_recovery" && audienceCohort !== "legacy") {
    return NextResponse.json({
      error: ZKLOGIN_SIGN_IN_COPY.errors.legacyClientRequired,
      code: "zklogin_legacy_client_required",
    }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
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
    const derived = jwtToAddress(body.id_token, existing.user_salt);
    const stored = normalizeSuiAddress(existing.sui_address);
    if (derived !== stored) {
      logRecoveryAudit(loginMode, audienceCohort, "audience_mismatch");
      const legacyAvailable = isBrowserLegacyRecoveryAvailable();
      return NextResponse.json({
        error: ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatchDetail,
        code: "zklogin_oauth_audience_mismatch",
        legacy_recovery_available: legacyAvailable,
      }, { status: 409 });
    }

    if (emailFromJwt) {
      await sb.from("sui_zklogin_identities")
        .update({ email: emailFromJwt, updated_at: new Date().toISOString() })
        .eq("oauth_sub", body.oauth_sub);
    }

    logRecoveryAudit(loginMode, audienceCohort, "success");
    return NextResponse.json({
      sui_address: existing.sui_address,
      user_salt: existing.user_salt,
      provider: body.provider ?? "google",
      oauth_sub: body.oauth_sub,
      email: emailFromJwt ?? existing.email,
    });
  }

  if (loginMode === "legacy_recovery") {
    logRecoveryAudit(loginMode, audienceCohort, "no_existing_account");
    return NextResponse.json({
      error: ZKLOGIN_SIGN_IN_COPY.errors.noExistingAccount,
      code: "zklogin_no_existing_account",
    }, { status: 404 });
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

  logRecoveryAudit("canonical", audienceCohort, "success");
  return NextResponse.json({
    sui_address,
    user_salt,
    provider: body.provider ?? "google",
    oauth_sub: body.oauth_sub,
    email,
  });
}
