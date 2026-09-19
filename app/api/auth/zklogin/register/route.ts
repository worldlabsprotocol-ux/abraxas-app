// FILE: app/api/auth/zklogin/register/route.ts
// Register or fetch a zkLogin Sui address for an OAuth subject.
// Server stores the user salt — required for deterministic address derivation.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtToAddress } from "@mysten/sui/zklogin";
import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  ensureZkLoginWalletBinding,
  type WalletBindingStatusResult,
} from "@/lib/credentials/ensureZkLoginWalletBinding";
import { isWalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";
import { verifyGoogleZkLoginIdToken } from "@/lib/auth/verifyZkLoginIdToken";
import {
  classifyGoogleAudience,
  isBrowserLegacyRecoveryAvailable,
  type ZkLoginLoginMode,
} from "@/lib/sui/zklogin/audienceCohorts";
import { suggestLoginModeAfterAudienceMismatch } from "@/lib/sui/zklogin/loginMode";
import {
  buildZkLoginRecoveryAuditMetadata,
} from "@/lib/sui/zklogin/recoveryAudit";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";
import {
  classifyZkLoginIdentitySaveError,
  logZkLoginIdentitySaveError,
} from "@/lib/auth/zkloginIdentitySaveError";
import {
  DEMO_SUPABASE_PROJECT_REF,
  isKnownProductionSupabaseRef,
  supabaseProjectRefFromUrl,
} from "@/lib/supabase/projectRefs";
import { evaluateDemoRuntime, isPublicDemoRuntime } from "@/lib/product/demoRuntime";

function supabaseRuntimeConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

function previewSupabaseBindingFailure(sbUrl: string, req: Request) {
  if (isPublicDemoRuntime()) {
    const evaluation = evaluateDemoRuntime({ request: req });
    if (!evaluation.ok) {
      console.error("[zklogin/register] demo_runtime_failed_closed", {
        fail_codes: evaluation.fail_codes,
        expected_demo_ref: DEMO_SUPABASE_PROJECT_REF,
      });
      return NextResponse.json({
        error: "DEMO environment must use isolated DEMO data on https://demo.abraxasworld.xyz",
        code: "demo_runtime_failed_closed",
        expected_supabase_ref: DEMO_SUPABASE_PROJECT_REF,
        fail_codes: evaluation.fail_codes,
      }, { status: 503 });
    }
  }
  const ref = supabaseProjectRefFromUrl(sbUrl);
  if (process.env.VERCEL_ENV !== "preview" || !isKnownProductionSupabaseRef(ref)) {
    return null;
  }
  console.error("[zklogin/register] preview_bound_to_production_supabase", {
    bound_ref: ref,
    expected_demo_ref: DEMO_SUPABASE_PROJECT_REF,
  });
  return NextResponse.json({
    error: "Preview deployment must use DEMO Supabase for partner audit flows",
    code: "preview_supabase_not_demo_bound",
    expected_supabase_ref: DEMO_SUPABASE_PROJECT_REF,
  }, { status: 503 });
}

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

async function persistZkLoginWalletBinding(
  suiAddress: string,
): Promise<WalletBindingStatusResult> {
  try {
    return await ensureZkLoginWalletBinding(suiAddress);
  } catch (error) {
    if (isWalletPersistenceError(error)) {
      console.warn("[zklogin/register] wallet binding persistence failed:", error.code);
      return {
        status: "failed",
        reason_code: error.code,
      };
    }
    throw error;
  }
}

export async function POST(req: Request) {
  try {
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

  const { url: sbUrl, key: sbKey } = supabaseRuntimeConfig();
  const previewBindingFailure = previewSupabaseBindingFailure(sbUrl, req);
  if (previewBindingFailure) return previewBindingFailure;

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

  if (!sbUrl || !sbKey) {
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

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

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
        suggested_login_mode: suggestLoginModeAfterAudienceMismatch(loginMode, legacyAvailable),
      }, { status: 409 });
    }

    if (emailFromJwt) {
      await sb.from("sui_zklogin_identities")
        .update({ email: emailFromJwt, updated_at: new Date().toISOString() })
        .eq("oauth_sub", body.oauth_sub);
    }

    const walletBindingStatus = await persistZkLoginWalletBinding(existing.sui_address);

    logRecoveryAudit(loginMode, audienceCohort, "success");
    return NextResponse.json({
      sui_address: existing.sui_address,
      user_salt: existing.user_salt,
      provider: body.provider ?? "google",
      oauth_sub: body.oauth_sub,
      email: emailFromJwt ?? existing.email,
      wallet_binding_status: walletBindingStatus.status,
      ...(walletBindingStatus.reason_code
        ? { wallet_binding_reason_code: walletBindingStatus.reason_code }
        : {}),
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
    logZkLoginIdentitySaveError(error);
    const code = classifyZkLoginIdentitySaveError(error);
    return NextResponse.json({ error: "Failed to save identity", code }, { status: 500 });
  }

  const walletBindingStatus = await persistZkLoginWalletBinding(sui_address);

  logRecoveryAudit("canonical", audienceCohort, "success");
  return NextResponse.json({
    sui_address,
    user_salt,
    provider: body.provider ?? "google",
    oauth_sub: body.oauth_sub,
    email,
    wallet_binding_status: walletBindingStatus.status,
    ...(walletBindingStatus.reason_code
      ? { wallet_binding_reason_code: walletBindingStatus.reason_code }
      : {}),
  });
  } catch (error) {
    const message = error instanceof Error ? error.message : "register_failed";
    console.error("[zklogin/register] unexpected_error", { message });
    return NextResponse.json({
      error: "Registration failed",
      code: "register_internal_error",
    }, { status: 500 });
  }
}
