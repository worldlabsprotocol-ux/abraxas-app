// FILE: lib/partner/launchpad/resolveLaunchpadApplication.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";

export async function getLaunchpadApplicationBySlug(
  publicSlug: string,
): Promise<LaunchpadApplicationRow | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_applications")
    .select("*")
    .eq("public_slug", publicSlug)
    .maybeSingle();
  return (data as LaunchpadApplicationRow | null) ?? null;
}

export async function getLaunchpadApplicationForPartner(
  applicationId: string,
  partnerId: string,
): Promise<LaunchpadApplicationRow | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  return (data as LaunchpadApplicationRow | null) ?? null;
}

export async function listLaunchpadApplicationsForPartner(
  partnerId: string,
): Promise<LaunchpadApplicationRow[]> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_applications")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  return (data as LaunchpadApplicationRow[]) ?? [];
}

export function validateLaunchpadHostedReturnUrl(
  app: LaunchpadApplicationRow,
  returnUrl: string,
): boolean {
  return isLaunchpadReturnUrlAllowlisted(app.allowed_return_urls, returnUrl);
}
