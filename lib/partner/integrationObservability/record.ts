// FILE: lib/partner/integrationObservability/record.ts
// Best-effort durable integration lifecycle recording. Never blocks authorization.

import { createHash, randomBytes } from "node:crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  IntegrationLifecycleEventType,
  IntegrationLifecycleStage,
  PartnerSafeFailureCode,
} from "./contract";
import { sanitizeIntegrationEventMetadata } from "./sanitize";

const TABLE = "partner_integration_events";
const memory: IntegrationEventRow[] = [];

export interface IntegrationEventInput {
  partnerId: string;
  applicationId?: string | null;
  environment: "sandbox" | "production";
  eventType: IntegrationLifecycleEventType;
  lifecycleStage: IntegrationLifecycleStage;
  outcome?: string | null;
  partnerSafeReason?: PartnerSafeFailureCode | null;
  requestId?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  policyVersion?: number | null;
  correlationId?: string | null;
  handoffRef?: string | null;
  latencyMs?: number | null;
  metadata?: Record<string, unknown>;
}

export interface IntegrationEventRow {
  event_id: string;
  created_at: string;
  partner_id: string;
  application_id: string | null;
  environment: "sandbox" | "production";
  event_type: IntegrationLifecycleEventType;
  lifecycle_stage: IntegrationLifecycleStage;
  outcome: string | null;
  partner_safe_reason: PartnerSafeFailureCode | null;
  request_id: string | null;
  receipt_id: string | null;
  policy_id: string | null;
  policy_version: number | null;
  correlation_id: string | null;
  handoff_ref: string | null;
  latency_ms: number | null;
  metadata: Record<string, string | number | boolean | null>;
}

function skipDurable(): boolean {
  return Boolean(process.env.VITEST);
}

export function resetIntegrationEventsForTests(): void {
  memory.length = 0;
}

export function listIntegrationEventsForTests(): IntegrationEventRow[] {
  return [...memory];
}

function opaqueEventId(seed: string): string {
  return `ie_${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

export function buildIntegrationEventRow(input: IntegrationEventInput): IntegrationEventRow {
  const now = new Date().toISOString();
  const seed = `${input.partnerId}:${input.eventType}:${now}:${randomBytes(8).toString("hex")}`;
  return {
    event_id: opaqueEventId(seed),
    created_at: now,
    partner_id: input.partnerId,
    application_id: input.applicationId ?? null,
    environment: input.environment,
    event_type: input.eventType,
    lifecycle_stage: input.lifecycleStage,
    outcome: input.outcome ?? null,
    partner_safe_reason: input.partnerSafeReason ?? null,
    request_id: input.requestId ?? null,
    receipt_id: input.receiptId ?? null,
    policy_id: input.policyId ?? null,
    policy_version: input.policyVersion ?? null,
    correlation_id: input.correlationId ?? null,
    handoff_ref: input.handoffRef ?? null,
    latency_ms: input.latencyMs ?? null,
    metadata: sanitizeIntegrationEventMetadata(input.metadata),
  };
}

export async function recordIntegrationEvent(input: IntegrationEventInput): Promise<IntegrationEventRow | null> {
  const row = buildIntegrationEventRow(input);
  memory.unshift(row);
  if (memory.length > 500) memory.length = 500;
  if (skipDurable()) return row;
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).insert({
      event_id: row.event_id,
      partner_id: row.partner_id,
      application_id: row.application_id,
      environment: row.environment,
      event_type: row.event_type,
      lifecycle_stage: row.lifecycle_stage,
      outcome: row.outcome,
      partner_safe_reason: row.partner_safe_reason,
      request_id: row.request_id,
      receipt_id: row.receipt_id,
      policy_id: row.policy_id,
      policy_version: row.policy_version,
      correlation_id: row.correlation_id,
      handoff_ref: row.handoff_ref,
      latency_ms: row.latency_ms,
      metadata: row.metadata,
    });
    if (error) {
      const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("schema")) return row;
      return row;
    }
  } catch {
    return row;
  }
  return row;
}

export async function recordIntegrationEventBestEffort(input: IntegrationEventInput): Promise<void> {
  try {
    await recordIntegrationEvent(input);
  } catch {
    // Observability must never affect authorization.
  }
}
