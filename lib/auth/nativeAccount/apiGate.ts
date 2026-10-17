// FILE: lib/auth/nativeAccount/apiGate.ts

import { NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "./featureFlag";
import { validateNativeAuthRuntimeConfig } from "./configValidation";
import { NativeAccountStoreUnavailableError } from "./store";

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

export function mapNativeStoreError(error: unknown): NextResponse | null {
  if (error instanceof NativeAccountStoreUnavailableError) {
    return nativeAuthUnavailableResponse();
  }
  return null;
}
