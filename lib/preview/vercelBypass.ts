// FILE: lib/preview/vercelBypass.ts
// Vercel Deployment Protection bypass for preview walkthroughs and automation.

export function resolveVercelProtectionBypass(): string {
  return (
    process.env.VERCEL_PROTECTION_BYPASS
    ?? process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ?? ""
  ).trim();
}

export function vercelBypassHeaders(bypass = resolveVercelProtectionBypass()): Record<string, string> {
  if (!bypass) return {};
  return {
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  };
}

export function isVercelSsoRedirect(location: string | null): boolean {
  if (!location) return false;
  return location.includes("vercel.com/sso") || location.includes("vercel.com/login");
}

/** Safe navigation target for bypass cookie seeding — never includes the secret in the URL. */
export function vercelBypassSeedTarget(previewUrl: string): string {
  return previewUrl.replace(/\/$/, "");
}

/** Redact bypass secrets from URLs before logging or writing reports. */
export function redactBypassFromUrl(url: string, bypass = resolveVercelProtectionBypass()): string {
  if (!bypass) return url;
  return url
    .replaceAll(bypass, "[REDACTED_BYPASS]")
    .replace(/x-vercel-protection-bypass=[^&]+/gi, "x-vercel-protection-bypass=[REDACTED]");
}

export function urlContainsBypassSecret(url: string, bypass = resolveVercelProtectionBypass()): boolean {
  if (!bypass) return false;
  return url.includes(bypass) || /x-vercel-protection-bypass=/i.test(url);
}
