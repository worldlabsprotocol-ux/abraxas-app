// FILE: lib/authenticationProof/proofLifecycle.ts
// Mark prior proofs for refresh/revocation when asset state changes.

import { createClient } from "@supabase/supabase-js";
import type { MonitoringDecision } from "@/lib/assetMonitoring/types";
import type { ProofLifecycleStatus } from "./types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const ABX_ID = /^ABX-[A-Z0-9-]+$/i;

export function extractAssetAbxId(
  recordPayload: Record<string, unknown>,
  recordId?: string,
): string | null {
  const fromPayload = recordPayload.asset_id ?? recordPayload.record_id;
  if (typeof fromPayload === "string" && ABX_ID.test(fromPayload.trim())) {
    return fromPayload.trim().toUpperCase();
  }
  if (recordId && ABX_ID.test(recordId.trim())) {
    return recordId.trim().toUpperCase();
  }
  return null;
}

export function lifecycleStatusForMonitoring(
  decision: MonitoringDecision,
): ProofLifecycleStatus {
  if (decision.action === "revoke") return "superseded";
  if (decision.action === "noop") return "active";
  return "refresh_required";
}

/** Prior active proofs for this asset are marked refresh_required or superseded. */
export async function supersedePriorProofsForAsset(input: {
  assetAbxId: string;
  newProofId: string;
  decision: MonitoringDecision;
}): Promise<number> {
  if (!SB_URL || !SB_KEY) return 0;

  const nextStatus = lifecycleStatusForMonitoring(input.decision);
  if (nextStatus === "active") return 0;

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("authentication_proofs")
    .update({
      status: nextStatus,
      superseded_by: input.newProofId,
    })
    .eq("asset_abx_id", input.assetAbxId.toUpperCase())
    .eq("status", "active")
    .neq("id", input.newProofId)
    .select("id");

  if (error) {
    console.warn("[proofLifecycle] supersede failed:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}

export function proofStillReliable(status: ProofLifecycleStatus): boolean {
  return status === "active";
}
