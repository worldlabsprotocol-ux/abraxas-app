// FILE: lib/assetMonitoring/listingStatus/snapshotStore.ts
// Persist last-known listing snapshots — memory for tests, Supabase for production cron.

import { createClient } from "@supabase/supabase-js";
import type { ListingSnapshot, ListingSnapshotMap } from "@/lib/assetMonitoring/listingStatus/types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SYSTEM_DID = "ABX-SYS-LISTING-MONITORING";

let memorySnapshots: ListingSnapshotMap = {};

function sb() {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export function resetListingSnapshotsForTests(): void {
  memorySnapshots = {};
}

export async function loadListingSnapshots(): Promise<ListingSnapshotMap> {
  const client = sb();
  if (!client) return { ...memorySnapshots };

  const { data, error } = await client
    .from("verified_registry")
    .select("assurance_taxonomy")
    .eq("did_identifier", SYSTEM_DID)
    .maybeSingle();

  if (error || !data?.assurance_taxonomy) {
    return { ...memorySnapshots };
  }

  const taxonomy = data.assurance_taxonomy as { listingSnapshots?: ListingSnapshotMap };
  const remote = taxonomy.listingSnapshots ?? {};
  memorySnapshots = { ...remote };
  return { ...memorySnapshots };
}

export async function saveListingSnapshots(next: ListingSnapshotMap): Promise<void> {
  memorySnapshots = { ...next };

  const client = sb();
  if (!client) return;

  const { error } = await client
    .from("verified_registry")
    .upsert(
      {
        did_identifier: SYSTEM_DID,
        display_name: "Listing monitoring snapshots",
        asset_class: "SYSTEM",
        verification_status: "RESOLVED_VALID",
        current_pipeline_stage: "MONITORING",
        assurance_level: 1,
        metadata_uri: "/trust-framework",
        assurance_taxonomy: { listingSnapshots: next },
        last_monitored_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "did_identifier" },
    );

  if (error) {
    console.warn("saveListingSnapshots:", error.message);
  }
}
