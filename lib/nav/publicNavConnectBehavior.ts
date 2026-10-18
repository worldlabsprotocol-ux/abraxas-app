// FILE: lib/nav/publicNavConnectBehavior.ts
// Pure Connect control routing — native passkey when operational; honest unavailable otherwise.

export type PublicNavConnectPhase =
  | "holder_profile_menu"
  | "native_account_link"
  | "native_passkey_connect"
  | "native_service_unavailable"
  | "native_explore";

export function resolvePublicNavConnectPhase(input: {
  /** Authoritative httpOnly browser session — not local storage alone. */
  holderBrowserSessionActive: boolean;
  nativeAuthenticated: boolean;
  /** Feature flag — native account auth intended for this deployment. */
  nativeFlagEnabled: boolean;
  /** Flag, config, and schema healthy — passkey ceremonies may run. */
  nativeOperational: boolean;
  nativeStateLoaded: boolean;
}): PublicNavConnectPhase | "loading" {
  if (!input.nativeStateLoaded) return "loading";
  if (input.holderBrowserSessionActive) return "holder_profile_menu";
  if (input.nativeAuthenticated) return "native_account_link";
  if (input.nativeOperational) return "native_passkey_connect";
  if (input.nativeFlagEnabled) return "native_service_unavailable";
  return "native_explore";
}

/** Public product paths that do not require account authentication. */
export const PUBLIC_CONNECT_EXPLORE_HREF = "/developers/integration-studio" as const;

/** Explicit legacy holder Passport — never the default Connect destination. */
export const PUBLIC_CONNECT_PASSPORT_LEGACY_HREF = "/passport" as const;

export const PUBLIC_CONNECT_ACCOUNT_HREF = "/account/applications" as const;

export const PUBLIC_CONNECT_UNAVAILABLE_MENU_TITLE = "Account sign-in unavailable";
export const PUBLIC_CONNECT_UNAVAILABLE_MENU_DESC =
  "Passkey sign-in is temporarily offline. Explore without signing in, retry when service is restored, or open Passport if you use holder credentials.";
