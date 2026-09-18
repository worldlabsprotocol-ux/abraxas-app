// FILE: lib/partner/launchpad/manageReturnUrls.ts
// Immutable callback URL updates for a Launchpad application.

export function addLaunchpadReturnUrl(allowedUrls: string[], returnUrl: string): string[] {
  return Array.from(new Set([...allowedUrls, returnUrl]));
}

export function removeLaunchpadReturnUrl(
  allowedUrls: string[],
  returnUrl: string,
): { ok: true; allowedUrls: string[] } | { ok: false; code: "return_url_not_found" | "return_url_last_remaining" } {
  if (!allowedUrls.includes(returnUrl)) return { ok: false, code: "return_url_not_found" };
  if (allowedUrls.length <= 1) return { ok: false, code: "return_url_last_remaining" };
  return { ok: true, allowedUrls: allowedUrls.filter((url) => url !== returnUrl) };
}
