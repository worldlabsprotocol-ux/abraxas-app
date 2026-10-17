// FILE: lib/nav/publicLaunchAppHref.ts
// Launch App — resume authorized operator or holder product surface (no default Google sign-in).

export const PUBLIC_LAUNCH_APP_LABEL = "Launch App" as const;

/** Default when session context is unknown (server / first paint). */
export const PUBLIC_LAUNCH_APP_DEFAULT_HREF = "/developers/launchpad" as const;

export function resolvePublicLaunchAppHref(input: {
  nativeAccountAuthenticated: boolean;
  holderPassportSignedIn: boolean;
}): string {
  if (input.nativeAccountAuthenticated) return "/account/applications";
  if (input.holderPassportSignedIn) return "/passport";
  return PUBLIC_LAUNCH_APP_DEFAULT_HREF;
}
