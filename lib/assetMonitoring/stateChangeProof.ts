// FILE: lib/assetMonitoring/stateChangeProof.ts
// Issue authentication proof when asset monitoring detects material state change.

import { issueAuthenticationProof } from "@/lib/authenticationProof/issue";
import { supersedePriorProofsForAsset } from "@/lib/authenticationProof/proofLifecycle";
import type { IssuedAuthenticationProof } from "@/lib/authenticationProof/types";
import type { AssetSignal } from "./types";
import type { MonitoringDecision } from "./types";

export async function issueAssetStateChangeProof(input: {
  signal: AssetSignal;
  decision: MonitoringDecision;
  changedBy: string;
}): Promise<IssuedAuthenticationProof & { prior_proofs_marked: number }> {
  const recordId = `${input.signal.assetId}:${input.signal.signalType}:${input.signal.observedAt}`;

  const proof = await issueAuthenticationProof({
    eventType: "asset_state_change",
    recordId,
    assetAbxId: input.signal.assetId,
    recordPayload: {
      asset_id: input.signal.assetId,
      signal_type: input.signal.signalType,
      observed_at: input.signal.observedAt,
      source: input.signal.source,
      detail: input.signal.detail ?? null,
      monitoring_action: input.decision.action,
      reason_code: input.decision.reasonCode,
      fail_closed: input.decision.failClosed,
      changed_by: input.changedBy,
      refresh_required: input.decision.action !== "noop",
    },
  });

  const prior_proofs_marked = await supersedePriorProofsForAsset({
    assetAbxId: input.signal.assetId,
    newProofId: proof.proof_id,
    decision: input.decision,
  });

  return { ...proof, prior_proofs_marked };
}
