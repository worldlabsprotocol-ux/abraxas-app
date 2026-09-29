// FILE: lib/partner/pilotEvidence/metrics.ts
// Compute partner value metrics from integration events.

import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { MetricValue, PartnerValueMetrics, TimeToValueMetrics } from "./contract";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { LaunchpadActivityRow } from "./load";
import {
  distinctReceiptIds,
  distinctRequestKeys,
  isLiveEvent,
  median,
  requestKey,
} from "./dedupe";

function measured<T>(id: string, value: T): MetricValue<T> {
  return { value, quality: "measured", definition_id: id };
}

function derived<T>(id: string, value: T): MetricValue<T> {
  return { value, quality: "derived", definition_id: id };
}

function unavailable<T>(id: string): MetricValue<T> {
  return { value: null as T, quality: "unavailable", definition_id: id };
}

export function computePartnerValueMetrics(events: IntegrationEventRow[]): PartnerValueMetrics {
  const live = events.filter(isLiveEvent);
  const requestKeys = distinctRequestKeys(live.filter((event) =>
    event.event_type === "verification_request_created"
    || event.event_type === "hosted_handoff_created"
    || event.event_type === "holder_flow_completed",
  ));
  const completedKeys = new Set<string>();
  for (const event of live) {
    if (event.event_type !== "holder_flow_completed") continue;
    const key = requestKey(event);
    if (key) completedKeys.add(key);
  }

  const issuedEvents = live.filter((event) => event.event_type === "receipt_issued");
  const uniqueReceiptsIssued = distinctReceiptIds(live, "receipt_issued");
  const verificationEvents = live.filter((event) =>
    event.event_type === "receipt_verification_succeeded"
    || event.event_type === "receipt_verification_failed",
  );
  const successes = verificationEvents.filter((event) => event.event_type === "receipt_verification_succeeded").length;
  const failures = verificationEvents.filter((event) => event.event_type === "receipt_verification_failed").length;
  const attempts = verificationEvents.length;
  const uniqueVerified = distinctReceiptIds(
    live.filter((event) => event.event_type === "receipt_verification_succeeded"),
    "receipt_verification_succeeded",
  );

  const reuseCount = live.filter((event) => event.event_type === "evidence_reuse_accepted").length;
  const refreshCount = live.filter((event) => event.event_type === "evidence_refresh_required").length;
  const reuseRejected = live.filter((event) => event.event_type === "evidence_reuse_rejected").length;

  const policyIds = new Set<string>();
  for (const event of live) {
    if (event.policy_id) policyIds.add(event.policy_id);
  }

  const latencies = verificationEvents
    .map((event) => event.latency_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const reuseDenominator = reuseCount + refreshCount;
  const repeatRequestCount = Math.max(0, completedKeys.size - 1);

  return {
    total_requests: measured("total_requests", requestKeys.size),
    completed_holder_flows: measured("completed_holder_flows", completedKeys.size),
    receipts_issued: measured("receipts_issued", issuedEvents.length),
    unique_receipts_issued: measured("unique_receipts_issued", uniqueReceiptsIssued.size),
    verification_attempts: measured("verification_attempts", attempts),
    successful_receipt_verifications: measured("successful_receipt_verifications", successes),
    failed_receipt_verifications: measured("failed_receipt_verifications", failures),
    unique_receipts_verified: measured("unique_receipts_verified", uniqueVerified.size),
    permit_decisions: measured("permit_decisions", live.filter((event) => event.event_type === "access_decision_permit").length),
    deny_decisions: measured("deny_decisions", live.filter((event) => event.event_type === "access_decision_deny").length),
    evidence_reuse_count: measured("evidence_reuse_count", reuseCount),
    evidence_refresh_required_count: measured("evidence_refresh_required_count", refreshCount),
    evidence_reuse_rejected_count: measured("evidence_reuse_rejected_count", reuseRejected),
    unique_policy_count: measured("unique_policy_count", policyIds.size),
    repeat_request_count: derived("repeat_request_count", repeatRequestCount),
    repeat_holder_usage: unavailable("repeat_holder_usage"),
    verification_success_rate: attempts > 0
      ? derived("verification_success_rate", Number((successes / attempts).toFixed(4)))
      : derived("verification_success_rate", null),
    reuse_rate: reuseDenominator > 0
      ? derived("reuse_rate", Number((reuseCount / reuseDenominator).toFixed(4)))
      : derived("reuse_rate", null),
    median_verification_latency_ms: derived("median_verification_latency_ms", median(latencies)),
  };
}

export function computeTimeToValueMetrics(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  activity: LaunchpadActivityRow[];
  environment: "sandbox" | "production";
}): TimeToValueMetrics {
  const appCreated = new Date(input.application.created_at).getTime();

  function msBetween(start: number | null, end: number | null): number | null {
    if (start == null || end == null || end < start) return null;
    return end - start;
  }

  function firstAt(types: string[], env?: "sandbox" | "production"): number | null {
    for (const event of input.events.filter(isLiveEvent)) {
      if (!types.includes(event.event_type)) continue;
      if (env && event.environment !== env) continue;
      return new Date(event.created_at).getTime();
    }
    return null;
  }

  function firstActivity(types: string[]): number | null {
    for (const row of input.activity) {
      if (types.includes(row.event_type)) return new Date(row.created_at).getTime();
    }
    return null;
  }

  const firstSandboxRequest = firstAt(["verification_request_created", "hosted_handoff_created"], "sandbox");
  const firstSandboxReceipt = firstAt(["receipt_issued"], "sandbox");
  const productionRequest = firstActivity(["production_access_requested"]);
  const productionActivated = input.application.production_activated_at
    ? new Date(input.application.production_activated_at).getTime()
    : firstAt(["production_activation_completed"]) ?? firstActivity(["production_application_activated"]);
  const firstProductionVerify = firstAt(["receipt_verification_succeeded"], "production");
  const holderStarted = firstAt(["holder_flow_started"], input.environment);
  const firstVerified = firstAt(["receipt_verification_succeeded"], input.environment);

  return {
    application_created_to_first_sandbox_request_ms: derived(
      "application_created_to_first_sandbox_request_ms",
      msBetween(appCreated, firstSandboxRequest),
    ),
    application_created_to_first_sandbox_receipt_ms: derived(
      "application_created_to_first_sandbox_receipt_ms",
      msBetween(appCreated, firstSandboxReceipt),
    ),
    application_created_to_production_request_ms: derived(
      "application_created_to_production_request_ms",
      msBetween(appCreated, productionRequest),
    ),
    production_activation_to_first_production_verification_ms: derived(
      "production_activation_to_first_production_verification_ms",
      msBetween(productionActivated, firstProductionVerify),
    ),
    first_holder_flow_to_first_verified_receipt_ms: derived(
      "first_holder_flow_to_first_verified_receipt_ms",
      msBetween(holderStarted, firstVerified),
    ),
  };
}

export function computePolicyConsumption(events: IntegrationEventRow[]) {
  const live = events.filter(isLiveEvent);
  const byPolicy = new Map<string, {
    policy_id: string;
    policy_version: number | null;
    pack_id: string | null;
    result_family: string | null;
    request_count: number;
    receipt_count: number;
    verification_count: number;
    reuse_count: number;
  }>();

  for (const event of live) {
    if (!event.policy_id) continue;
    const row = byPolicy.get(event.policy_id) ?? {
      policy_id: event.policy_id,
      policy_version: event.policy_version,
      pack_id: inferPolicyPackFromPolicyId(event.policy_id)?.id ?? null,
      result_family: inferPolicyPackFromPolicyId(event.policy_id)?.disclosed_result ?? null,
      request_count: 0,
      receipt_count: 0,
      verification_count: 0,
      reuse_count: 0,
    };
    if (event.event_type === "verification_request_created" || event.event_type === "hosted_handoff_created") {
      row.request_count += 1;
    }
    if (event.event_type === "receipt_issued") row.receipt_count += 1;
    if (event.event_type === "receipt_verification_succeeded" || event.event_type === "receipt_verification_failed") {
      row.verification_count += 1;
    }
    if (event.event_type === "evidence_reuse_accepted") row.reuse_count += 1;
    byPolicy.set(event.policy_id, row);
  }

  return Array.from(byPolicy.values()).sort((a, b) => b.request_count - a.request_count);
}
