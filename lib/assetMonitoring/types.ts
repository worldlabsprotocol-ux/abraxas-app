// FILE: lib/assetMonitoring/types.ts
// Asset monitoring v1 — material state-change signals for credential refresh/revoke.

export type AssetSignalType =
  | "ownership_transfer"
  | "lien_recorded"
  | "appraisal_expired"
  | "identity_ttl_expired"
  | "listing_status_change"
  | "manual_operator_flag";

export type MonitoringAction = "refresh" | "revoke" | "suspend" | "review" | "noop";

export interface AssetSignal {
  assetId: string;
  signalType: AssetSignalType;
  observedAt: string;
  source: string;
  detail?: string;
  claimIds?: string[];
}

export interface MonitoringDecision {
  action: MonitoringAction;
  claimStatus?: "under_review" | "revoked" | "suspended";
  reasonCode: string;
  summary: string;
  failClosed: boolean;
}

export interface MonitoringApplyResult {
  claimId: string;
  ok: boolean;
  action: MonitoringAction;
  fromStatus?: string;
  toStatus?: string;
  error?: string;
}
