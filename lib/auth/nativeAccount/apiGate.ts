// FILE: lib/auth/nativeAccount/apiGate.ts

import { NextResponse } from "next/server";
import { isNativeAccountAuthEnabled } from "./featureFlag";
import { NativeAccountStoreUnavailableError } from "./store";

export function nativeAuthDisabledResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, code: "native_account_auth_disabled" },
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
  return null;
}

export function mapNativeStoreError(error: unknown): NextResponse | null {
  if (error instanceof NativeAccountStoreUnavailableError) {
    return nativeAuthUnavailableResponse();
  }
  return null;
}
