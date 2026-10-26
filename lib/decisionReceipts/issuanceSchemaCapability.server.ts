// FILE: lib/decisionReceipts/issuanceSchemaCapability.server.ts

import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  parseIssuanceFinalizationSchemaFromEnv,
  type IssuanceFinalizationSchemaCapability,
} from "@/lib/decisionReceipts/issuanceSchemaCapability";

export type { IssuanceFinalizationSchemaCapability, IssuanceFinalizationSchemaMode } from "@/lib/decisionReceipts/issuanceSchemaCapability";
export { StagedIssuanceUnavailableError, parseIssuanceFinalizationSchemaFromEnv } from "@/lib/decisionReceipts/issuanceSchemaCapability";

let cachedCapability: IssuanceFinalizationSchemaCapability | null = null;

export function resetIssuanceFinalizationSchemaCapabilityCache(): void {
  cachedCapability = null;
}

async function probeStagedIssuanceColumn(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb
      .from("decision_receipts")
      .select("id, issuance_finalized_at")
      .limit(1);
    if (!error) return true;
    const msg = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (
      msg.includes("issuance_finalized_at")
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

export async function resolveIssuanceFinalizationSchemaCapability(
  env: Record<string, string | undefined> = process.env,
): Promise<IssuanceFinalizationSchemaCapability> {
  const fromEnv = parseIssuanceFinalizationSchemaFromEnv(env);
  if (fromEnv) {
    cachedCapability = fromEnv;
    return fromEnv;
  }

  if (cachedCapability) return cachedCapability;

  const stagedIssuanceEnabled = await probeStagedIssuanceColumn();
  cachedCapability = stagedIssuanceEnabled
    ? { mode: "v151", stagedIssuanceEnabled: true }
    : { mode: "legacy", stagedIssuanceEnabled: false };
  return cachedCapability;
}
