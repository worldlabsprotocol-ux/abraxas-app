// FILE: lib/partner/validatePartnerKeyIssuance.ts
// Enforce org registry + environment policy before issuing API keys.

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface KeyIssuanceValidation {
  ok: boolean;
  error?: string;
  status?: number;
  partner?: {
    company: string;
    status: string;
    allowed_environments: string[];
  };
}

export async function validatePartnerKeyIssuance(
  partnerId: string,
  environment: "live" | "test",
): Promise<KeyIssuanceValidation> {
  if (!SB_URL || !SB_KEY) {
    return { ok: true };
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("partners")
    .select("company, status, allowed_environments")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (!data) {
    return {
      ok: false,
      error: "Partner org not registered — create org at /admin/partners first",
      status: 400,
    };
  }

  const allowed = (data.allowed_environments ?? []) as string[];
  const envNeeded = environment === "live" ? "production" : "sandbox";

  if (!allowed.includes(envNeeded)) {
    return {
      ok: false,
      error: `Partner not approved for ${envNeeded} keys. Current: ${allowed.join(", ") || "none"}`,
      status: 403,
      partner: {
        company: data.company,
        status: data.status,
        allowed_environments: allowed,
      },
    };
  }

  if (environment === "live" && data.status !== "active" && data.status !== "pilot") {
    return {
      ok: false,
      error: `Partner status "${data.status}" — promote to pilot/active before live keys`,
      status: 403,
      partner: {
        company: data.company,
        status: data.status,
        allowed_environments: allowed,
      },
    };
  }

  return {
    ok: true,
    partner: {
      company: data.company,
      status: data.status,
      allowed_environments: allowed,
    },
  };
}
