// FILE: lib/assetMonitoring/apply.ts
// Apply monitoring decisions to credential claims via status registry.

import { transitionClaimStatus } from "@/lib/trust/credentialStatusRegistry";
import { evaluateAssetSignal, monitoringActionToClaimStatus } from "./evaluate";
import { issueAssetStateChangeProof } from "./stateChangeProof";
import type { AssetSignal, MonitoringApplyResult } from "./types";
import type { IssuedAuthenticationProof } from "@/lib/authenticationProof/types";

export async function applyAssetSignal(input: {
  signal: AssetSignal;
  claimIds: string[];
  changedBy: string;
  idempotencyPrefix?: string;
}): Promise<{
  decision: ReturnType<typeof evaluateAssetSignal>;
  results: MonitoringApplyResult[];
  state_change_proof?: IssuedAuthenticationProof;
}> {
  const decision = evaluateAssetSignal(input.signal);
  const targetStatus = monitoringActionToClaimStatus(decision);

  if (!targetStatus || !input.claimIds.length) {
    const state_change_proof = await issueAssetStateChangeProof({
      signal: input.signal,
      decision,
      changedBy: input.changedBy,
    }).catch(() => undefined);

    return {
      decision,
      results: input.claimIds.map(claimId => ({
        claimId,
        ok: true,
        action: decision.action,
      })),
      state_change_proof,
    };
  }

  const results: MonitoringApplyResult[] = [];

  for (const claimId of input.claimIds) {
    const result = await transitionClaimStatus({
      claimId,
      toStatus: targetStatus,
      reasonCode: decision.reasonCode,
      changedBy: input.changedBy,
      idempotencyKey: input.idempotencyPrefix
        ? `${input.idempotencyPrefix}:${claimId}:${input.signal.signalType}`
        : undefined,
      metadata: {
        asset_id: input.signal.assetId,
        signal_type: input.signal.signalType,
        observed_at: input.signal.observedAt,
        source: input.signal.source,
        detail: input.signal.detail ?? null,
      },
    });

    results.push({
      claimId,
      ok: result.ok,
      action: decision.action,
      fromStatus: result.ok ? result.from : undefined,
      toStatus: result.ok ? result.to : undefined,
      error: result.ok ? undefined : result.error,
    });
  }

  const state_change_proof = await issueAssetStateChangeProof({
    signal: input.signal,
    decision,
    changedBy: input.changedBy,
  }).catch(() => undefined);

  return { decision, results, state_change_proof };
}
