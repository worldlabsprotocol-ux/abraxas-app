// FILE: lib/stocklana/vercelBypass.ts
// Vercel Deployment Protection bypass helpers for Stocklana walkthroughs.

export function readVercelProtectionBypass(): string | undefined {
  const value = process.env.VERCEL_PROTECTION_BYPASS?.trim();
  return value || undefined;
}

export function buildVercelBypassHeaders(bypass?: string): Record<string, string> {
  if (!bypass) return {};
  return {
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  };
}
