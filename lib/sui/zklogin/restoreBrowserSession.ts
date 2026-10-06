// FILE: lib/sui/zklogin/restoreBrowserSession.ts
// Restore holder UI state when an installed Passport has the secure server session
// but its local app storage is empty.

import type { ZkLoginUserSession } from "./session";

type BrowserSessionProfile = {
  sui_address?: unknown;
  email?: unknown;
  provider?: unknown;
};

function isNormalizedSuiAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value);
}

export async function restoreUserSessionFromBrowserSession(
  fetcher: typeof fetch = fetch,
): Promise<ZkLoginUserSession | null> {
  try {
    const response = await fetcher("/api/auth/zklogin/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return null;

    const profile = await response.json() as BrowserSessionProfile;
    if (!isNormalizedSuiAddress(profile.sui_address)) return null;

    const provider = profile.provider === "abraxas_hosted"
      ? "abraxas_hosted"
      : profile.provider === "apple"
        ? "apple"
        : "google";
    const email = typeof profile.email === "string" && profile.email.includes("@")
      ? profile.email
      : undefined;

    return {
      suiAddress: profile.sui_address,
      provider,
      email,
      maxEpoch: 0,
      loggedInAt: new Date().toISOString(),
      sessionKind: provider === "abraxas_hosted" ? "hosted" : "oauth",
    };
  } catch {
    return null;
  }
}
