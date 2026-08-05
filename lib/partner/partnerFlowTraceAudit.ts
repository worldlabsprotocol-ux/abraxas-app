// FILE: lib/partner/partnerFlowTraceAudit.ts
// Read-only production audit for Partner Flow trace correlation (P1-3).

import {
  findPartnerFlowAuditMetadataPiiViolations,
  PARTNER_FLOW_AUDIT_ACTION_TIERS,
  PARTNER_FLOW_AUDIT_METADATA_KEYS,
} from "@/lib/partner/partnerFlowAuditContract";

export interface PartnerFlowTraceAuditEvent {
  id: string;
  action: string;
  object_type: string | null;
  object_id: string | null;
  policy_id: string | null;
  policy_version: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PartnerFlowTraceAuditResult {
  flow_trace_id: string;
  event_count: number;
  events: PartnerFlowTraceAuditEvent[];
  correlation_ok: boolean;
  sequence_ok: boolean;
  linkage_ok: boolean;
  pii_ok: boolean;
  issues: string[];
}

export interface PartnerFlowTraceAuditQuery {
  flowTraceId: string;
  fetchEvents: (flowTraceId: string) => Promise<PartnerFlowTraceAuditEvent[]>;
}

function metadataString(
  metadata: Record<string, unknown>,
  key: (typeof PARTNER_FLOW_AUDIT_METADATA_KEYS)[number],
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function analyzePartnerFlowTrace(
  flowTraceId: string,
  events: PartnerFlowTraceAuditEvent[],
): PartnerFlowTraceAuditResult {
  const issues: string[] = [];
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  let correlation_ok = true;
  let linkage_ok = true;
  let pii_ok = true;

  const partnerIds = new Set<string>();
  const policyIds = new Set<string>();
  const verificationRequestIds = new Set<string>();
  const decisionIds = new Set<string>();
  const receiptIds = new Set<string>();
  let receiptIssuedCount = 0;
  let idempotentReplayCount = 0;

  for (const event of sorted) {
    const meta = event.metadata ?? {};

    if (metadataString(meta, "flow_trace_id") !== flowTraceId) {
      correlation_ok = false;
      issues.push(`flow_trace_mismatch:${event.action}:${event.id}`);
    }

    const partnerId = metadataString(meta, "partner_id");
    const policyId = metadataString(meta, "policy_id");
    const vrId = metadataString(meta, "verification_request_id");
    const decisionId = metadataString(meta, "decision_id") ?? event.object_id;
    const receiptId = metadataString(meta, "receipt_id")
      ?? (event.object_type === "decision_receipt" ? event.object_id : null);

    if (partnerId) partnerIds.add(partnerId);
    if (policyId) policyIds.add(policyId);
    if (vrId) verificationRequestIds.add(vrId);
    if (decisionId) decisionIds.add(decisionId);
    if (receiptId) receiptIds.add(receiptId);

    if (event.action === "partner_flow.receipt_issued") receiptIssuedCount += 1;
    if (event.action === "partner_flow.idempotent_replay") idempotentReplayCount += 1;

    const piiViolations = findPartnerFlowAuditMetadataPiiViolations(meta);
    if (piiViolations.length > 0) {
      pii_ok = false;
      issues.push(...piiViolations.map(v => `${event.action}:${v}`));
    }
  }

  if (partnerIds.size > 1) {
    linkage_ok = false;
    issues.push(`multiple_partner_ids:${Array.from(partnerIds).join(",")}`);
  }
  if (policyIds.size > 1) {
    linkage_ok = false;
    issues.push(`multiple_policy_ids:${Array.from(policyIds).join(",")}`);
  }
  if (verificationRequestIds.size > 1) {
    linkage_ok = false;
    issues.push(`multiple_verification_request_ids:${Array.from(verificationRequestIds).join(",")}`);
  }
  if (receiptIssuedCount > 1) {
    linkage_ok = false;
    issues.push(`duplicate_receipt_issued_events:${receiptIssuedCount}`);
  }

  const presentActions = sorted.map(e => e.action);
  const knownTiers = presentActions
    .map(action => PARTNER_FLOW_AUDIT_ACTION_TIERS[action])
    .filter((tier): tier is number => tier !== undefined);

  let sequence_ok = knownTiers.every(
    (tier, i) => i === 0 || tier >= knownTiers[i - 1],
  );
  if (!sequence_ok) {
    issues.push(`unexpected_event_order:${presentActions.join("→")}`);
  }

  if (sorted.length === 0) {
    issues.push("no_events_found");
    correlation_ok = false;
    linkage_ok = false;
    sequence_ok = false;
  }

  return {
    flow_trace_id: flowTraceId,
    event_count: sorted.length,
    events: sorted,
    correlation_ok,
    sequence_ok,
    linkage_ok,
    pii_ok,
    issues,
  };
}

export async function auditPartnerFlowTrace(
  query: PartnerFlowTraceAuditQuery,
): Promise<PartnerFlowTraceAuditResult> {
  const events = await query.fetchEvents(query.flowTraceId);
  return analyzePartnerFlowTrace(query.flowTraceId, events);
}
