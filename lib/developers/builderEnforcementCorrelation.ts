// FILE: lib/developers/builderEnforcementCorrelation.ts
// Correlate partner_integration_events before treating them as builder enforcement evidence.

import { isHarnessReceiptId } from "@/lib/developers/builderExternalIntegrationAcceptance";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

export type BuilderEnforcementBind = {
  partnerId: string;
  applicationId: string;
  policyId: string;
};

export type CorrelatedEnforcementReceipt = {
  receipt_id: string;
  request_ids: string[];
  partner_reported_permit: boolean;
  partner_reported_deny: boolean;
  partner_reported_indeterminate: boolean;
  correlated_permit_chain: boolean;
  correlated_deny_chain: boolean;
};

export function integrationEventBoundToBuilderContext(
  event: IntegrationEventRow,
  bind: BuilderEnforcementBind,
): boolean {
  if (event.partner_id !== bind.partnerId) return false;
  if (event.application_id && event.application_id !== bind.applicationId) return false;
  if (event.policy_id && event.policy_id !== bind.policyId) return false;
  if (isHarnessReceiptId(event.receipt_id)) return false;
  return true;
}

function requestKey(event: IntegrationEventRow): string | null {
  return event.request_id?.trim() || event.correlation_id?.trim() || null;
}

function buildCorrelatedReceiptGroups(bound: IntegrationEventRow[]): Map<string, IntegrationEventRow[]> {
  const byRequest = new Map<string, IntegrationEventRow[]>();
  for (const event of bound) {
    const key = requestKey(event);
    if (!key) continue;
    const list = byRequest.get(key) ?? [];
    list.push(event);
    byRequest.set(key, list);
  }

  const receiptIds = new Set<string>();
  for (const event of bound) {
    const receiptId = event.receipt_id?.trim();
    if (receiptId) receiptIds.add(receiptId);
  }

  const groups = new Map<string, IntegrationEventRow[]>();
  for (const receiptId of receiptIds) {
    const merged: IntegrationEventRow[] = [];
    const seen = new Set<string>();
    const push = (event: IntegrationEventRow) => {
      const dedupe = `${event.event_id}:${event.event_type}:${event.receipt_id ?? ""}:${event.request_id ?? ""}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      merged.push(event);
    };

    for (const event of bound) {
      if (event.receipt_id?.trim() === receiptId) push(event);
    }

    const requestIds = new Set<string>();
    for (const event of merged) {
      const key = requestKey(event);
      if (key) requestIds.add(key);
    }
    for (const key of requestIds) {
      for (const event of byRequest.get(key) ?? []) {
        push(event);
      }
    }

    groups.set(receiptId, merged);
  }
  return groups;
}

function requestIdsConsistent(events: IntegrationEventRow[]): boolean {
  const ids = events.map((event) => event.request_id?.trim()).filter((id): id is string => Boolean(id));
  if (ids.length <= 1) return true;
  return new Set(ids).size === 1;
}

function hasLiveRequestOrigin(events: IntegrationEventRow[]): boolean {
  return events.some((event) =>
    event.event_type === "hosted_handoff_created"
    || event.event_type === "verification_request_created",
  );
}

function hasReceiptMaterial(events: IntegrationEventRow[]): boolean {
  return events.some((event) =>
    event.event_type === "receipt_issued"
    || event.event_type === "hosted_handoff_completed",
  );
}

function verificationSucceededPermitted(events: IntegrationEventRow[]): boolean {
  const row = events.find((event) => event.event_type === "receipt_verification_succeeded");
  if (!row) return false;
  const outcome = (row.outcome ?? "").toLowerCase();
  return outcome === "permitted" || outcome === "permit" || outcome === "";
}

function correlatedPermitChain(events: IntegrationEventRow[]): boolean {
  if (!hasLiveRequestOrigin(events) || !hasReceiptMaterial(events)) return false;
  if (!requestIdsConsistent(events)) return false;
  if (!events.some((event) => event.event_type === "access_decision_permit")) return false;
  return verificationSucceededPermitted(events);
}

function correlatedDenyChain(events: IntegrationEventRow[]): boolean {
  if (!hasLiveRequestOrigin(events) || !hasReceiptMaterial(events)) return false;
  if (!requestIdsConsistent(events)) return false;
  if (!events.some((event) => event.event_type === "access_decision_deny")) return false;
  const verificationFailed = events.some((event) => event.event_type === "receipt_verification_failed");
  const verificationDenyOutcome = events.some((event) => {
    if (event.event_type !== "receipt_verification_succeeded") return false;
    const outcome = (event.outcome ?? "").toLowerCase();
    return outcome === "denied" || outcome === "deny" || outcome === "indeterminate";
  });
  return verificationFailed || verificationDenyOutcome;
}

/** Partner-reported integration telemetry grouped and filtered — not platform proof by itself. */
export function correlateBuilderEnforcementReceipts(
  events: IntegrationEventRow[],
  bind: BuilderEnforcementBind,
): CorrelatedEnforcementReceipt[] {
  const bound = events.filter((event) => integrationEventBoundToBuilderContext(event, bind));
  const grouped = buildCorrelatedReceiptGroups(bound);
  const out: CorrelatedEnforcementReceipt[] = [];

  for (const [receipt_id, receiptEvents] of Array.from(grouped.entries())) {
    const rows: IntegrationEventRow[] = receiptEvents;
    out.push({
      receipt_id,
      request_ids: Array.from(
        new Set(
          rows
            .map((event) => event.request_id?.trim())
            .filter((id): id is string => Boolean(id)),
        ),
      ),
      partner_reported_permit: rows.some((event) => event.event_type === "access_decision_permit"),
      partner_reported_deny: rows.some((event) => event.event_type === "access_decision_deny"),
      partner_reported_indeterminate: rows.some((event) =>
        event.event_type === "receipt_verification_failed"
        || event.event_type === "receipt_current_validity_failed",
      ),
      correlated_permit_chain: correlatedPermitChain(rows),
      correlated_deny_chain: correlatedDenyChain(rows),
    });
  }

  return out;
}
