// FILE: lib/nav/publicNavConnectBehavior.ts
// Public header routing — Solana wallet sign-in (primary), explore, unavailable.

export type PublicNavSignInPhase =
  | "native_account_link"
  | "native_solana_sign_in"
  | "native_service_unavailable"
  | "native_explore_only";

export function resolvePublicNavSignInPhase(input: {
  nativeAuthenticated: boolean;
  nativeFlagEnabled: boolean;
  nativeOperational: boolean;
  nativeStateLoaded: boolean;
}): PublicNavSignInPhase | "loading" {
  if (!input.nativeStateLoaded) return "loading";
  if (input.nativeAuthenticated) return "native_account_link";
  if (input.nativeOperational) return "native_solana_sign_in";
  if (input.nativeFlagEnabled) return "native_service_unavailable";
  return "native_explore_only";
}

export const PUBLIC_NAV_EXPLORE_HREF = "/developers/integration-studio" as const;
export const PUBLIC_NAV_WORKSPACE_HREF = "/#start-sandbox" as const;
export const PUBLIC_CONNECT_ACCOUNT_HREF = "/account/applications" as const;

export const PUBLIC_SIGN_IN_UNAVAILABLE_TITLE = "Sign-in temporarily unavailable";
export const PUBLIC_SIGN_IN_UNAVAILABLE_DESC =
  "Solana account sign-in is offline. Explore Abraxas without signing in while service is restored.";
