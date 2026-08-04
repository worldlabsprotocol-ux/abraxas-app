// FILE: lib/connect/returnUrlAllowlist.ts
// Prevent open redirects — return URLs must match partner allowlist.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function isReturnUrlAllowed(partnerId: string, returnUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(returnUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (parsed.protocol === "http:" && parsed.hostname !== "localhost") return false;

  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partners")
    .select("allowed_return_urls")
    .eq("partner_id", partnerId)
    .maybeSingle();

  const allowed = data?.allowed_return_urls as string[] | undefined;
  if (!allowed?.length) return false;

  const normalized = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  return allowed.some(entry => {
    try {
      const u = new URL(entry);
      const candidate = `${u.origin}${u.pathname}`.replace(/\/$/, "");
      return normalized === candidate || normalized.startsWith(`${candidate}/`);
    } catch {
      return false;
    }
  });
}

export function buildRedirectUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}
