// FILE: lib/identity/providerIngestion/readinessProbe.ts
// Production readiness probe — provider ingestion requires migration 127 tables.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export interface ProviderIngestionReadiness {
  ready: boolean;
  missing: string[];
}

const REQUIRED_OBJECTS: Array<{ kind: "table"; name: string; probeColumn: string } | { kind: "rpc"; name: string }> = [
  { kind: "table", name: "identity_subjects", probeColumn: "id" },
  { kind: "table", name: "provider_subject_bindings", probeColumn: "provider_id" },
  { kind: "table", name: "provider_event_replay", probeColumn: "provider_id" },
  { kind: "rpc", name: "consume_provider_event_replay" },
];

export async function probeProviderIngestionReadiness(): Promise<ProviderIngestionReadiness> {
  const missing: string[] = [];
  const sb = requireSupabaseAdmin();

  for (const obj of REQUIRED_OBJECTS) {
    if (obj.kind === "table") {
      const { error } = await sb.from(obj.name).select(obj.probeColumn).limit(1);
      if (error?.message?.includes("does not exist") || error?.code === "42P01") {
        missing.push(`table:${obj.name}`);
      }
    }
  }

  const { error: rpcError } = await sb.rpc("consume_provider_event_replay", {
    p_provider_id: "probe",
    p_provider_event_id: "probe",
    p_event_hash: "probe",
  });
  if (rpcError?.message?.includes("does not exist") || rpcError?.code === "42883") {
    missing.push("rpc:consume_provider_event_replay");
  }

  return { ready: missing.length === 0, missing };
}
