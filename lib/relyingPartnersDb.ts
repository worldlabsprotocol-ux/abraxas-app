// FILE: lib/relyingPartnersDb.ts
// DB-backed external relying party registry.

import { createClient } from "@supabase/supabase-js";
import type { RelyingPartnerRecord } from "@/lib/relyingPartners";
import { INTERNAL_PARTNER_IDS } from "@/lib/partner/internalPartners";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function sb() {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export async function getExternalRelyingPartnersFromDb(): Promise<RelyingPartnerRecord[]> {
  const client = sb();
  if (!client) return [];

  const { data, error } = await client
    .from("partners")
    .select("partner_id, company, status, use_case, assigned_policy_id, public_listing_ok, created_at")
    .in("status", ["pilot", "active", "live"])
    .eq("is_external", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("getExternalRelyingPartnersFromDb:", error.message);
    return [];
  }

  return (data ?? [])
    .filter(row => !INTERNAL_PARTNER_IDS.has((row.partner_id as string).toLowerCase()))
    .filter(row => row.public_listing_ok !== false)
    .map(row => ({
      partner_id: row.partner_id as string,
      company: row.company as string,
      category: "External relying party",
      status: mapPartnerStatus(row.status as string),
      policy_id: (row.assigned_policy_id as string) ?? "abraxas-core-v1",
      policy_name: "Partner-assigned policy",
      description: (row.use_case as string) ?? "Production relying party integration.",
      api_entry: "POST /api/credentials/verify",
      consent_flow: true,
      external: true,
      launched_at: row.created_at as string,
    }));
}

function mapPartnerStatus(status: string): RelyingPartnerRecord["status"] {
  if (status === "active" || status === "live") return "live";
  if (status === "pilot") return "pilot";
  return "recruiting";
}
