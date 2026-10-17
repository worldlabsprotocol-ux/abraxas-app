// FILE: lib/nav/publicNavConnectBehavior.ts
// Pure Connect control routing — native account first, holder Passport separate.

export type PublicNavConnectPhase =
  | "holder_profile_menu"
  | "native_account_link"
  | "native_passkey_connect"
  | "native_unavailable_recovery";

export function resolvePublicNavConnectPhase(input: {
  holderSignedIn: boolean;
  nativeAuthenticated: boolean;
  nativeEnabled: boolean;
  nativeStateLoaded: boolean;
}): PublicNavConnectPhase | "loading" {
  if (!input.nativeStateLoaded) return "loading";
  if (input.holderSignedIn) return "holder_profile_menu";
  if (input.nativeAuthenticated) return "native_account_link";
  if (input.nativeEnabled) return "native_passkey_connect";
  return "native_unavailable_recovery";
}

export const PUBLIC_CONNECT_NATIVE_UNAVAILABLE_HREF = "/developers/integration-studio" as const;

export const PUBLIC_CONNECT_ACCOUNT_HREF = "/account/applications" as const;
