// FILE: lib/decisionReceipts/v1_1_0/v11PersistenceCapability.server.ts
import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  parseV11DedicatedPersistenceFromEnv,
  type V11PersistenceCapability,
} from "@/lib/decisionReceipts/v1_1_0/v11PersistenceCapability";

let cached: V11PersistenceCapability | null = null;

export function resetV11PersistenceCapabilityCache(): void {
  cached = null;
}

async function probeDedicatedColumns(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb
      .from("decision_receipts")
      .select("id, application_binding_ref, v11_issuance_phase")
      .limit(1);
    if (!error) return true;
    const msg = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (
      msg.includes("application_binding_ref")
      || msg.includes("v11_issuance_phase")
      || msg.includes("column")
      || error.code === "42703"
      || error.code === "PGRST204"
    ) {
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

export async function resolveV11PersistenceCapability(
  env: Record<string, string | undefined> = process.env,
): Promise<V11PersistenceCapability> {
  const fromEnv = parseV11DedicatedPersistenceFromEnv(env);
  if (fromEnv) {
    if (fromEnv.dedicatedMode === "v152" && !fromEnv.atomicFinalizeEnabled) {
      cached = fromEnv;
      return fromEnv;
    }
    if (fromEnv.dedicatedMode === "v152" && fromEnv.atomicFinalizeEnabled) {
      const probed = await probeDedicatedColumns();
      if (!probed) {
        return {
          dedicatedMode: "v152",
          dedicatedColumnsEnabled: false,
          atomicFinalizeEnabled: false,
        };
      }
      cached = fromEnv;
      return fromEnv;
    }
    cached = fromEnv;
    return fromEnv;
  }

  if (cached) return cached;

  const dedicatedColumnsEnabled = await probeDedicatedColumns();
  cached = {
    dedicatedMode: dedicatedColumnsEnabled ? "v152" : "legacy",
    dedicatedColumnsEnabled,
    atomicFinalizeEnabled: false,
  };
  return cached;
}
