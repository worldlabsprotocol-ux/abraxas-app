// FILE: lib/auth/ephemeralWallet/apiGate.ts

import { NextResponse } from "next/server";
import { validateEphemeralWalletRuntimeConfig } from "./configValidation";
import { isEphemeralWalletAuthEnabled } from "./featureFlag";
import { resolveEphemeralWalletAuthOperationalAsync } from "./operational";
import { EphemeralStateUnavailableError } from "./errors";

export function ephemeralWalletDisabledResponse(): NextResponse {
  return NextResponse.json({ ok: false, code: "ephemeral_wallet_auth_disabled" }, { status: 503 });
}

export function ephemeralWalletMisconfiguredResponse(code: string): NextResponse {
  return NextResponse.json({ ok: false, code: `ephemeral_wallet_auth_misconfigured_${code}` }, { status: 503 });
}

export function ephemeralWalletUnavailableResponse(): NextResponse {
  return NextResponse.json({ ok: false, code: "ephemeral_state_unavailable" }, { status: 503 });
}

export function assertEphemeralWalletAuthEnabled(): NextResponse | null {
  if (!isEphemeralWalletAuthEnabled()) return ephemeralWalletDisabledResponse();
  const config = validateEphemeralWalletRuntimeConfig();
  if (!config.ok) {
    if (config.code === "disabled") return ephemeralWalletDisabledResponse();
    return ephemeralWalletMisconfiguredResponse(config.code);
  }
  return null;
}

export async function assertEphemeralWalletAuthOperational(): Promise<NextResponse | null> {
  const base = assertEphemeralWalletAuthEnabled();
  if (base) return base;
  const op = await resolveEphemeralWalletAuthOperationalAsync();
  if (!op.operational) {
    return NextResponse.json(
      { ok: false, code: op.degraded_reason ?? "ephemeral_wallet_auth_unavailable" },
      { status: 503 },
    );
  }
  return null;
}

export function mapEphemeralStoreError(error: unknown): NextResponse | null {
  if (error instanceof EphemeralStateUnavailableError) {
    return ephemeralWalletUnavailableResponse();
  }
  return null;
}
