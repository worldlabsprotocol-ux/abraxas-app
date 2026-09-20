// FILE: lib/partner/launchpad/productionReview/snapshot.ts
// Safe operator queue projection. No keys, receipts, callbacks, wallets, or PII.

import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { PRODUCTION_REVIEW_NOTICE, PRODUCTION_REVIEW_VERSION } from "./contract";
import type { ProductionReviewGateResult } from "./evaluate";
import { opaqueProductionRequestRef, sanitizeReviewNote } from "./opaque";

export interface ProductionReviewQueueItem {
  request_ref: string;
  request_id: string;
  app_label: string;
  policy_id: string;
  policy_version: number;
  selected_capabilities: string[];
  sandbox_readiness_class: string;
  test_console_class: string;
  webhook_health_class: string;
  policy_compatibility_class: string;
  network_contexts: Array<{ network_id: string; status: string; environment: string }>;
  submitted_note: string | null;
  submitted_at: string;
  decision_status: string;
  issues_production_key: false;
  activates_mainnet: false;
}

export function toProductionReviewQueueItem(input: {
  requestId: string;
  status: string;
  createdAt: string;
  note: string | null;
  application: Pick<LaunchpadApplicationRow, "display_name" | "application_name" | "public_slug" | "policy_id" | "policy_version">;
  evidence: GoLiveEvidence;
  gates: ProductionReviewGateResult;
}): ProductionReviewQueueItem {
  return {
    request_ref: opaqueProductionRequestRef(input.requestId),
    request_id: input.requestId,
    app_label: input.application.display_name || input.application.application_name || input.application.public_slug,
    policy_id: input.application.policy_id,
    policy_version: input.application.policy_version,
    selected_capabilities: input.gates.selected_capabilities,
    sandbox_readiness_class: input.gates.readiness_class,
    test_console_class: input.gates.test_console_class,
    webhook_health_class: input.gates.webhook_health_class,
    policy_compatibility_class: input.gates.policy_compatibility,
    network_contexts: input.gates.network_postures,
    submitted_note: sanitizeReviewNote(input.note),
    submitted_at: input.createdAt,
    decision_status: input.status,
    issues_production_key: false,
    activates_mainnet: false,
  };
}

export function productionReviewPublicEnvelope(items: ProductionReviewQueueItem[]) {
  return {
    version: PRODUCTION_REVIEW_VERSION,
    notice: PRODUCTION_REVIEW_NOTICE,
    issues_production_key: false as const,
    activates_mainnet: false as const,
    executes: false as const,
    items,
  };
}

export function productionReviewLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  for (const needle of [
    "abx_live_",
    "abx_test_",
    "abx_whsec_",
    "receipt_id",
    "wallet_address",
    "callback_url",
    "allowed_return_urls",
    "id_token",
    "oauth",
    "sqlstate",
    "service_role",
    "legal_name",
    "date_of_birth",
  ]) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}
