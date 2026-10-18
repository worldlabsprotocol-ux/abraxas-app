// FILE: lib/auth/nativeAccount/apiGate.ts

import { NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "./featureFlag";
import { validateNativeAuthRuntimeConfig } from "./configValidation";
import { probeNativeAuthSchemaReady } from "./schemaReadiness";
import { probeSolanaAccountAuthSchemaReady } from "./solanaSchemaReadiness";
import { resolveSolanaAccountAuthOperational } from "./solanaOperational";
import { NativeAccountStoreUnavailableError } from "./storeErrors";

export function nativeAuthDisabledResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, code: "native_account_auth_disabled" },
    { status: 503 },
  );
}

export function nativeAuthMisconfiguredResponse(code: string): NextResponse {
  return NextResponse.json(
    { ok: false, code: `native_account_auth_misconfigured_${code}` },
    { status: 503 },
  );
}

export function nativeAuthUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, code: "native_account_store_unavailable" },
    { status: 503 },
  );
}

export function assertNativeAuthEnabled(): NextResponse | null {
  if (!isNativeAccountAuthEnabled()) return nativeAuthDisabledResponse();
  const config = validateNativeAuthRuntimeConfig();
  if (!config.ok) {
    if (config.code === "disabled") return nativeAuthDisabledResponse();
    return nativeAuthMisconfiguredResponse(config.code);
  }
  return null;
}

/** Flag + config + schema — fail closed when persistence is not ready (avoids broken Connect / 500). */
export async function assertNativeAuthOperational(): Promise<NextResponse | null> {
  const base = assertNativeAuthEnabled();
  if (base) return base;
  const schema = await probeNativeAuthSchemaReady();
  if (!schema.ok) return nativeAuthUnavailableResponse();
  return null;
}

/** Solana wallet account sign-in — does not require WebAuthn migration 145. */
export async function assertSolanaAccountAuthOperational(): Promise<NextResponse | null> {
  const base = assertNativeAuthEnabled();
  if (base) return base;
  const schema = await probeSolanaAccountAuthSchemaReady();
  if (!schema.ok) return nativeAuthUnavailableResponse();
  const op = resolveSolanaAccountAuthOperational({ schema });
  if (!op.operational) {
    return NextResponse.json(
      { ok: false, code: op.degraded_reason ?? "solana_account_auth_unavailable" },
      { status: 503 },
    );
  }
  return null;
}

export function mapNativeStoreError(error: unknown): NextResponse | null {
  if (error instanceof NativeAccountStoreUnavailableError) {
    return nativeAuthUnavailableResponse();
  }
  return null;
}
