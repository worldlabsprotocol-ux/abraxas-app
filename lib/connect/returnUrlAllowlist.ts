// FILE: lib/connect/returnUrlAllowlist.ts
// Prevent open redirects — return URLs must match partner allowlist.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isPartnerReturnUrlAllowlisted } from "@/lib/connect/returnUrlAllowlistSemantics";

export async function isReturnUrlAllowed(partnerId: string, returnUrl: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partners")
    .select("allowed_return_urls")
    .eq("partner_id", partnerId)
    .maybeSingle();

  const allowed = data?.allowed_return_urls as string[] | undefined;
  return isPartnerReturnUrlAllowlisted(allowed, returnUrl);
}

export function buildRedirectUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}
