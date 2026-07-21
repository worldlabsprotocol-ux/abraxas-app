// FILE: lib/partner/promoteDesignPartner.ts
// Promote design partner application → registered org + sandbox API key.

import { createClient } from "@supabase/supabase-js";
import { generatePartnerKey, type PartnerScope } from "@/lib/partner/partnerAuth";
import { slugifyPartnerId } from "@/lib/partner/partnerOnboarding";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const DEFAULT_SCOPES: PartnerScope[] = ["verify:credential", "verify:registry"];

export interface DesignPartnerApplication {
  id: string;
  company: string;
  contact_name: string | null;
  email: string;
  use_case: string | null;
  integration_type: string | null;
  public_name_ok: boolean | null;
  status: string;
  promoted_partner_id: string | null;
}

export interface PromoteResult {
  partner_id: string;
  company: string;
  api_key: string;
  key_prefix: string;
  application_id: string;
}

export async function promoteDesignPartnerApplication(
  application: DesignPartnerApplication,
  options?: { partner_id?: string; issue_live?: boolean },
): Promise<PromoteResult> {
  if (!SB_URL || !SB_KEY) {
    throw new Error("Supabase not configured");
  }

  if (application.promoted_partner_id) {
    throw new Error(`Application already promoted as ${application.promoted_partner_id}`);
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const partnerId = options?.partner_id?.trim() || slugifyPartnerId(application.company);
  const environment = options?.issue_live ? "live" : "test";

  const { error: partnerError } = await sb.from("partners").upsert(
    {
      partner_id: partnerId,
      company: application.company,
      contact_name: application.contact_name,
      contact_email: application.email,
      use_case: application.use_case,
      status: "pilot",
      allowed_environments: environment === "live" ? ["sandbox", "production"] : ["sandbox"],
      is_external: true,
      public_listing_ok: Boolean(application.public_name_ok),
      onboarding_notes: `Promoted from design partner application ${application.id}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "partner_id" },
  );

  if (partnerError) {
    throw new Error(partnerError.message);
  }

  const { raw, prefix, hash } = generatePartnerKey(environment);
  const { error: keyError } = await sb.from("partner_api_keys").insert({
    partner_id: partnerId,
    display_name: `${application.company} · ${environment === "live" ? "production" : "sandbox"}`,
    key_prefix: prefix,
    key_hash: hash,
    scopes: DEFAULT_SCOPES,
  });

  if (keyError) {
    throw new Error(keyError.message);
  }

  const { error: appError } = await sb
    .from("design_partners")
    .update({
      status: "onboarded",
      promoted_partner_id: partnerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", application.id);

  if (appError) {
    throw new Error(appError.message);
  }

  return {
    partner_id: partnerId,
    company: application.company,
    api_key: raw,
    key_prefix: prefix,
    application_id: application.id,
  };
}
