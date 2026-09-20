// FILE: lib/partner/launchpad/recordActivity.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import { sanitizeLaunchpadActivityMetadata } from "@/lib/privacy/selectiveDisclosure";

export async function recordLaunchpadActivity(
  sb: SupabaseClient,
  input: {
    applicationId: string;
    partnerId: string;
    eventType: LaunchpadActivityEventType;
    publicCode?: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await sb.from("partner_launchpad_activity").insert({
    application_id: input.applicationId,
    partner_id: input.partnerId,
    event_type: input.eventType,
    public_code: input.publicCode ?? null,
    metadata: sanitizeLaunchpadActivityMetadata(input.metadata ?? {}),
  });
}
