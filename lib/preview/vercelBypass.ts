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

export function vercelBypassSeedUrl(previewUrl: string, bypass = resolveVercelProtectionBypass()): string {
  const base = previewUrl.replace(/\/$/, "");
  if (!bypass) return base;
  const params = new URLSearchParams({
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  });
  return `${base}/?${params.toString()}`;
}
