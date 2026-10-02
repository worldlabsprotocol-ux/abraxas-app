// FILE: lib/identity/providerIngestion/readinessProbe.ts
// Production readiness probe — provider ingestion requires migration 127 tables.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export interface ProviderIngestionReadiness {
  ready: boolean;
  missing: string[];
}

const REQUIRED_TABLES = [
  "identity_subjects",
  "provider_subject_bindings",
  "provider_event_replay",
] as const;

const REQUIRED_RPC = "consume_provider_event_replay";

export async function probeProviderIngestionReadiness(): Promise<ProviderIngestionReadiness> {
  const missing: string[] = [];
  const sb = requireSupabaseAdmin();

  for (const table of REQUIRED_TABLES) {
    const { error } = await sb.from(table).select("id").limit(1);
    if (error?.message?.includes("does not exist") || error?.code === "42P01") {
      missing.push(`table:${table}`);
    }
  }

  const { error: rpcError } = await sb.rpc(REQUIRED_RPC, {
    p_provider_id: "probe",
    p_provider_event_id: "probe",
    p_event_hash: "probe",
  });
  if (rpcError?.message?.includes("does not exist") || rpcError?.code === "42883") {
    missing.push(`rpc:${REQUIRED_RPC}`);
  }

  return { ready: missing.length === 0, missing };
}
