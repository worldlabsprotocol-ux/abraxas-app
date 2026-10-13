// FILE: lib/institutionalCertification/build548/replayKey.ts
// Canonical replay scope for external relying parties (Build #548).

import { createHash } from "node:crypto";

/** Single-use consumption scope — NOT keyed by request_id (retries cannot mint new grants). */
export const BUILD_548_REPLAY_SCOPE = "single_use_partner_policy_receipt_v1" as const;

export type ReplayConsumptionScope = {
  partnerId: string;
  policyId: string;
  receiptId: string;
  scope?: typeof BUILD_548_REPLAY_SCOPE;
};

export function buildCanonicalReplayKey(scope: ReplayConsumptionScope): string {
  const scopeId = scope.scope ?? BUILD_548_REPLAY_SCOPE;
  const material = [
    scopeId,
    scope.partnerId.trim(),
    scope.policyId.trim(),
    scope.receiptId.trim(),
  ].join("\0");
  return createHash("sha256").update(material).digest("hex");
}

export function consumptionIdForAttempt(scope: ReplayConsumptionScope, requestId: string): string {
  return createHash("sha256")
    .update(`${buildCanonicalReplayKey(scope)}:${requestId}`)
    .digest("hex")
    .slice(0, 24);
}
