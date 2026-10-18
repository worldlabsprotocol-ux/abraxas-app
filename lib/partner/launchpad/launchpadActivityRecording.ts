// FILE: lib/partner/launchpad/launchpadActivityRecording.ts
import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import { sanitizeLaunchpadActivityMetadata } from "@/lib/privacy/selectiveDisclosure";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";

export async function recordLaunchpadActivityEvent(input: {
  applicationId: string;
  partnerId: string;
  eventType: LaunchpadActivityEventType;
  publicCode?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const metadata = sanitizeLaunchpadActivityMetadata(input.metadata ?? {});
  if (launchpadUsesSovereignPostgres()) {
    const { pgInsertLaunchpadActivity } = await import(
      "@/lib/partner/launchpad/sovereign/launchpadPgStore"
    );
    await pgInsertLaunchpadActivity({
      applicationId: input.applicationId,
      partnerId: input.partnerId,
      eventType: input.eventType,
      publicCode: input.publicCode,
      metadata,
    });
    return;
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  await sb.from("partner_launchpad_activity").insert({
    application_id: input.applicationId,
    partner_id: input.partnerId,
    event_type: input.eventType,
    public_code: input.publicCode ?? null,
    metadata,
  });
}
