// FILE: lib/partner/logPartnerUsage.ts
// Fire-and-forget partner API usage logging.

import { createClient } from "@supabase/supabase-js";
import type { PartnerAuthContext } from "@/lib/partner/partnerAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface PartnerUsageEntry {
  endpoint: string;
  method: string;
  success?: boolean;
  responseState?: string;
  partner?: PartnerAuthContext | null;
}

export async function logPartnerUsage(entry: PartnerUsageEntry): Promise<void> {
  if (!SB_URL || !SB_KEY) return;

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { error } = await sb.from("partner_api_usage").insert({
    partner_id: entry.partner?.partnerId ?? null,
    api_key_id: entry.partner?.apiKeyId ?? null,
    endpoint: entry.endpoint,
    method: entry.method,
    success: entry.success ?? null,
    response_state: entry.responseState ?? null,
  });

  if (error) {
    console.warn("partner_api_usage insert failed:", error.message);
  }
}
