// Partner application ownership for institutional consume — no cross-tenant use.

import type { PartnerAuthContext } from "@/lib/partner/partnerAuth";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export type ApplicationBindingResult =
  | { ok: true; applicationId: string | null }
  | { ok: false; error: "application_mismatch" | "application_not_found" | "application_unavailable" };

export async function resolveInstitutionalApplicationBinding(input: {
  auth: PartnerAuthContext | null;
  requestedApplicationId: string | null | undefined;
}): Promise<ApplicationBindingResult> {
  const requested = input.requestedApplicationId?.trim() || null;
  const keyApp = input.auth?.launchpadApplicationId?.trim() || null;

  if (keyApp && requested && keyApp !== requested) {
    return { ok: false, error: "application_mismatch" };
  }

  const effective = requested ?? keyApp;
  if (!effective) {
    return { ok: true, applicationId: null };
  }

  if (!SB_URL || !SB_KEY) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "application_unavailable" };
    }
    return { ok: true, applicationId: effective };
  }

  const client = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const partnerId = input.auth?.partnerId;
  if (!partnerId) {
    return { ok: false, error: "application_unavailable" };
  }

  const { data, error } = await client
    .from("partner_launchpad_applications")
    .select("id")
    .eq("id", effective)
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error) return { ok: false, error: "application_unavailable" };
  if (!data) return { ok: false, error: "application_not_found" };
  return { ok: true, applicationId: effective };
}
