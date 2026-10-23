// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryOwnershipEvidenceStore.ts

import { nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { nativeAccountUsesMemory } from "@/lib/auth/nativeAccount/nativeAccountPersistence";

export type LaunchpadProvisioningEvidence = {
  activity_id: string | null;
  event_type: string;
  public_code: string | null;
  provisioned_at: string | null;
};

const PROVISIONING_EVENT_TYPES = new Set(["application_provisioned"]);

export async function findLaunchpadProvisioningEvidence(
  applicationId: string,
  partnerId: string,
  activityId?: string,
): Promise<LaunchpadProvisioningEvidence | null> {
  if (nativeAccountUsesMemory()) {
    return nativeAccountMemory.findLaunchpadProvisioningEvidence(applicationId, partnerId, activityId);
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();

  let query = sb
    .from("partner_launchpad_activity")
    .select("id, event_type, public_code, created_at")
    .eq("application_id", applicationId)
    .eq("partner_id", partnerId)
    .in("event_type", Array.from(PROVISIONING_EVENT_TYPES))
    .order("created_at", { ascending: true })
    .limit(1);

  if (activityId) {
    query = sb
      .from("partner_launchpad_activity")
      .select("id, event_type, public_code, created_at")
      .eq("id", activityId)
      .eq("application_id", applicationId)
      .eq("partner_id", partnerId)
      .in("event_type", Array.from(PROVISIONING_EVENT_TYPES))
      .limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return {
    activity_id: data.id ? String(data.id) : null,
    event_type: String(data.event_type),
    public_code: data.public_code ? String(data.public_code) : null,
    provisioned_at: data.created_at ? String(data.created_at) : null,
  };
}
