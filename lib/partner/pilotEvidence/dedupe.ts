// FILE: lib/partner/pilotEvidence/dedupe.ts
// Deduplication semantics for partner value metrics.

import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

export function isHarnessEvent(event: IntegrationEventRow): boolean {
  return event.metadata.harness === true || event.metadata.smoke_probe === true;
}

export function isLiveEvent(event: IntegrationEventRow): boolean {
  return !isHarnessEvent(event);
}

/** Stable request key for deduplication across retries. */
export function requestKey(event: IntegrationEventRow): string | null {
  return event.request_id ?? event.correlation_id ?? event.handoff_ref ?? null;
}

export function distinctRequestKeys(events: IntegrationEventRow[]): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    const key = requestKey(event);
    if (key) keys.add(key);
  }
  return keys;
}

export function eventsForRequestKey(events: IntegrationEventRow[], key: string): IntegrationEventRow[] {
  return events.filter((event) => requestKey(event) === key);
}

export function distinctReceiptIds(events: IntegrationEventRow[], eventType: string): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.event_type !== eventType) continue;
    if (event.receipt_id) ids.add(event.receipt_id);
  }
  return ids;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export function filterByEnvironment(
  events: IntegrationEventRow[],
  environment: "sandbox" | "production",
): IntegrationEventRow[] {
  return events.filter((event) => event.environment === environment);
}

export function filterByTimeWindow(
  events: IntegrationEventRow[],
  from: Date | null,
  to: Date | null,
): IntegrationEventRow[] {
  return events.filter((event) => {
    const at = new Date(event.created_at).getTime();
    if (from && at < from.getTime()) return false;
    if (to && at > to.getTime()) return false;
    return true;
  });
}
