// FILE: lib/auth/legacyAuthRoutes.ts
// Disabled legacy auth / wallet routes — inventory for regression tests.

import { NextResponse } from "next/server";

export const LEGACY_WALLET_BINDING_DISABLED_CODE = "legacy_wallet_binding_disabled";
export const LEGACY_AUTH_ROUTE_DISABLED_CODE = "legacy_auth_route_disabled";

export const DISABLED_LEGACY_AUTH_ROUTES = [
  "/api/auth/wallet/create",
  "/api/auth/link-wallet",
  "/api/wallet/binding/challenge",
  "/api/wallet/binding/confirm",
] as const;

export function legacyWalletBindingDisabledResponse(): NextResponse {
  return NextResponse.json({
    error: "Legacy Sui wallet binding is disabled. Sign in again to repair your zkLogin wallet binding, or bind an external wallet through wallet-authority.",
    code: LEGACY_WALLET_BINDING_DISABLED_CODE,
  }, { status: 410 });
}

export function legacyAuthRouteDisabledResponse(): NextResponse {
  return NextResponse.json({
    error: "This legacy authentication route is disabled.",
    code: LEGACY_AUTH_ROUTE_DISABLED_CODE,
  }, { status: 410 });
}
