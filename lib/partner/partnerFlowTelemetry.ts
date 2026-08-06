// FILE: lib/partner/partnerFlowTelemetry.ts
// P1-4 Partner Flow operational telemetry — counts, latency, outcomes; no PII.

import { findPartnerFlowAuditMetadataPiiViolations } from "@/lib/partner/partnerFlowAuditContract";
import type { PartnerFlowRateLimitEndpoint } from "@/lib/partner/partnerFlowRateLimit";

export type PartnerFlowTelemetryOutcome =
  | "success"
  | "client_error"
  | "server_error"
  | "rate_limited"
  | "not_found"
  | "unauthorized";

export interface PartnerFlowTelemetryEvent {
  ts: string;
  endpoint: PartnerFlowRateLimitEndpoint | string;
  method: string;
  outcome: PartnerFlowTelemetryOutcome;
  http_status: number;
  latency_ms: number;
  rate_limited: boolean;
  partner_id: string | null;
  policy_id: string | null;
  audit_persistence_failed: boolean;
}

export interface PartnerFlowTelemetryInput {
  endpoint: PartnerFlowRateLimitEndpoint | string;
  method: string;
  httpStatus: number;
  latencyMs: number;
  rateLimited?: boolean;
  partnerId?: string | null;
  policyId?: string | null;
  auditPersistenceFailed?: boolean;
}

const TELEMETRY_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_IN_MEMORY_EVENTS = 10_000;

const inMemoryEvents: PartnerFlowTelemetryEvent[] = [];

const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const EMAIL_PATTERN = /@[a-z0-9.-]+\.[a-z]{2,}/i;
const WALLET_PATTERN = /^0x[a-fA-F0-9]{40,}$/;
const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

function classifyOutcome(input: PartnerFlowTelemetryInput): PartnerFlowTelemetryOutcome {
  if (input.rateLimited || input.httpStatus === 429) return "rate_limited";
  if (input.httpStatus === 401 || input.httpStatus === 403) return "unauthorized";
  if (input.httpStatus === 404) return "not_found";
  if (input.httpStatus >= 500) return "server_error";
  if (input.httpStatus >= 400) return "client_error";
  return "success";
}

function sanitizeId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (JWT_PATTERN.test(trimmed) || EMAIL_PATTERN.test(trimmed) || WALLET_PATTERN.test(trimmed)) {
    return null;
  }
  if (IPV4_PATTERN.test(trimmed)) return null;
  if (trimmed.length > 120) return null;
  return trimmed;
}

export function buildPartnerFlowTelemetryEvent(
  input: PartnerFlowTelemetryInput,
): PartnerFlowTelemetryEvent {
  return {
    ts: new Date().toISOString(),
    endpoint: input.endpoint,
    method: input.method.toUpperCase(),
    outcome: classifyOutcome(input),
    http_status: input.httpStatus,
    latency_ms: Math.max(0, Math.round(input.latencyMs)),
    rate_limited: Boolean(input.rateLimited || input.httpStatus === 429),
    partner_id: sanitizeId(input.partnerId),
    policy_id: sanitizeId(input.policyId),
    audit_persistence_failed: Boolean(input.auditPersistenceFailed),
  };
}

export function partnerFlowTelemetryHasNoPii(event: PartnerFlowTelemetryEvent): boolean {
  const violations = findPartnerFlowAuditMetadataPiiViolations(event as unknown as Record<string, unknown>);
  if (violations.length > 0) return false;

  for (const value of [event.partner_id, event.policy_id, event.endpoint, event.outcome]) {
    if (typeof value === "string") {
      if (JWT_PATTERN.test(value) || EMAIL_PATTERN.test(value) || WALLET_PATTERN.test(value)) {
        return false;
      }
      if (IPV4_PATTERN.test(value)) return false;
    }
  }

  return true;
}

function pruneInMemoryEvents(now: number): void {
  const cutoff = now - TELEMETRY_RETENTION_MS;
  while (inMemoryEvents.length > 0 && inMemoryEvents[0]!.ts < new Date(cutoff).toISOString()) {
    inMemoryEvents.shift();
  }
  while (inMemoryEvents.length > MAX_IN_MEMORY_EVENTS) {
    inMemoryEvents.shift();
  }
}

export function recordPartnerFlowTelemetry(input: PartnerFlowTelemetryInput): PartnerFlowTelemetryEvent {
  const event = buildPartnerFlowTelemetryEvent(input);

  inMemoryEvents.push(event);
  pruneInMemoryEvents(Date.now());

  console.log(JSON.stringify({
    type: "abraxas_partner_flow_telemetry",
    ...event,
  }));

  return event;
}

export interface PartnerFlowTelemetryEndpointSummary {
  endpoint: string;
  method: string;
  total: number;
  success: number;
  client_error: number;
  server_error: number;
  rate_limited: number;
  unauthorized: number;
  not_found: number;
  error_rate: number;
  rate_limit_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  partner_ids: string[];
  policy_ids: string[];
}

export interface PartnerFlowTelemetrySnapshot {
  window_hours: number;
  generated_at: string;
  total_requests: number;
  rate_limited_total: number;
  error_total: number;
  audit_persistence_failures: number;
  by_endpoint: PartnerFlowTelemetryEndpointSummary[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

export function summarizePartnerFlowTelemetry(
  events: PartnerFlowTelemetryEvent[],
  windowHours = 24,
): PartnerFlowTelemetrySnapshot {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoff).toISOString();
  const windowed = events.filter(e => e.ts >= cutoffIso);

  const groups = new Map<string, PartnerFlowTelemetryEvent[]>();
  for (const event of windowed) {
    const key = `${event.method}:${event.endpoint}`;
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const byEndpoint: PartnerFlowTelemetryEndpointSummary[] = [];
  let rateLimitedTotal = 0;
  let errorTotal = 0;
  let auditFailures = 0;

  for (const [key, list] of Array.from(groups.entries())) {
    const [method, ...endpointParts] = key.split(":");
    const endpoint = endpointParts.join(":");
    const latencies = list.map((e: PartnerFlowTelemetryEvent) => e.latency_ms).sort((a: number, b: number) => a - b);
    const total = list.length;
    const success = list.filter((e: PartnerFlowTelemetryEvent) => e.outcome === "success").length;
    const clientError = list.filter((e: PartnerFlowTelemetryEvent) => e.outcome === "client_error").length;
    const serverError = list.filter((e: PartnerFlowTelemetryEvent) => e.outcome === "server_error").length;
    const rateLimited = list.filter((e: PartnerFlowTelemetryEvent) => e.outcome === "rate_limited").length;
    const unauthorized = list.filter((e: PartnerFlowTelemetryEvent) => e.outcome === "unauthorized").length;
    const notFound = list.filter((e: PartnerFlowTelemetryEvent) => e.outcome === "not_found").length;
    const errors = clientError + serverError + unauthorized;

    rateLimitedTotal += rateLimited;
    errorTotal += errors;
    auditFailures += list.filter((e: PartnerFlowTelemetryEvent) => e.audit_persistence_failed).length;

    const partnerIds = list
      .map((e: PartnerFlowTelemetryEvent) => e.partner_id)
      .filter((id: string | null): id is string => Boolean(id));
    const policyIds = list
      .map((e: PartnerFlowTelemetryEvent) => e.policy_id)
      .filter((id: string | null): id is string => Boolean(id));

    byEndpoint.push({
      endpoint,
      method: method ?? "GET",
      total,
      success,
      client_error: clientError,
      server_error: serverError,
      rate_limited: rateLimited,
      unauthorized,
      not_found: notFound,
      error_rate: total > 0 ? Number((errors / total).toFixed(4)) : 0,
      rate_limit_rate: total > 0 ? Number((rateLimited / total).toFixed(4)) : 0,
      avg_latency_ms: total > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / total) : 0,
      p95_latency_ms: percentile(latencies, 95),
      partner_ids: Array.from(new Set(partnerIds)).slice(0, 20),
      policy_ids: Array.from(new Set(policyIds)).slice(0, 20),
    });
  }

  byEndpoint.sort((a, b) => b.total - a.total);

  return {
    window_hours: windowHours,
    generated_at: new Date().toISOString(),
    total_requests: windowed.length,
    rate_limited_total: rateLimitedTotal,
    error_total: errorTotal,
    audit_persistence_failures: auditFailures,
    by_endpoint: byEndpoint,
  };
}

export function getPartnerFlowTelemetrySnapshot(windowHours = 24): PartnerFlowTelemetrySnapshot {
  return summarizePartnerFlowTelemetry(inMemoryEvents, windowHours);
}

/** Test-only reset. */
export function resetPartnerFlowTelemetryForTests(): void {
  inMemoryEvents.length = 0;
}
