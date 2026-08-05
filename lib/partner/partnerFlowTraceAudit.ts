// FILE: lib/partner/partnerFlowTraceAudit.ts
// Read-only production audit for Partner Flow trace correlation (P1-3).

import {
  findPartnerFlowAuditMetadataPiiViolations,
  PARTNER_FLOW_AUDIT_ACTIONS,
  PARTNER_FLOW_AUDIT_METADATA_KEYS,
  type PartnerFlowIssuanceOperation,
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

function isSequenceNeutralEvent(event: PartnerFlowTraceAuditEvent): boolean {
  if (event.action === PARTNER_FLOW_AUDIT_ACTIONS.rejected) return true;
  return metadataString(event.metadata ?? {}, "outcome") === "error";
}

function hasEligibleTerminalContext(
  hasEvaluate: boolean,
  hasConsent: boolean,
  hasReceiptIssued: boolean,
): boolean {
  return hasEvaluate || hasConsent || hasReceiptIssued;
}

function issuanceCycleKey(
  operation: PartnerFlowIssuanceOperation,
  idempotencyKey: string | null,
  receiptId: string,
): string {
  if (operation === "refresh") return `refresh:${receiptId}`;
  return `${operation}:${idempotencyKey ?? `receipt:${receiptId}`}`;
}

function resolveIssuanceOperation(metadata: Record<string, unknown>): PartnerFlowIssuanceOperation {
  return (metadataString(metadata, "issuance_operation") ?? "evaluate") as PartnerFlowIssuanceOperation;
}

function validatePartnerFlowReceiptIssuance(
  sorted: PartnerFlowTraceAuditEvent[],
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const seenReceiptIds = new Set<string>();
  const seenIssuanceCycles = new Set<string>();
  const knownReceiptIds = new Set<string>();

  for (const event of sorted) {
    if (event.action !== PARTNER_FLOW_AUDIT_ACTIONS.receiptIssued) continue;

    const meta = event.metadata ?? {};
    const receiptId = metadataString(meta, "receipt_id")
      ?? (event.object_type === "decision_receipt" ? event.object_id : null);
    const operation = resolveIssuanceOperation(meta);
    const idempotencyKey = metadataString(meta, "idempotency_key");
    const replacedReceiptId = metadataString(meta, "replaced_receipt_id");

    if (!receiptId) {
      issues.push("receipt_issued_missing_receipt_id");
      continue;
    }

    if (seenReceiptIds.has(receiptId)) {
      issues.push(`duplicate_receipt_id_issued:${receiptId}`);
    }
    seenReceiptIds.add(receiptId);

    const cycleKey = issuanceCycleKey(operation, idempotencyKey, receiptId);
    if (seenIssuanceCycles.has(cycleKey)) {
      issues.push(`duplicate_issuance_cycle:${cycleKey}`);
    }
    seenIssuanceCycles.add(cycleKey);

    if (operation === "refresh" && replacedReceiptId && !knownReceiptIds.has(replacedReceiptId)) {
      issues.push(`refresh_receipt_unknown_replaced_id:${replacedReceiptId}`);
    }

    knownReceiptIds.add(receiptId);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Validates causal ordering per attempt/cycle instead of one global monotonic tier.
 * Rejected and error-outcome events are ignored for sequence checks.
 */
function validatePartnerFlowSequence(
  sorted: PartnerFlowTraceAuditEvent[],
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  let hasEvaluate = false;
  let hasConsent = false;
  let hasReceiptIssued = false;
  let issuanceContext: "none" | "evaluate" | "consent" = "none";
  let preludeReady = false;
  const knownReceiptIds = new Set<string>();
  const sequenceActions: string[] = [];

  for (const event of sorted) {
    if (isSequenceNeutralEvent(event)) continue;

    sequenceActions.push(event.action);
    const meta = event.metadata ?? {};

    switch (event.action) {
      case PARTNER_FLOW_AUDIT_ACTIONS.evaluate:
        hasEvaluate = true;
        issuanceContext = "evaluate";
        preludeReady = false;
        break;

      case PARTNER_FLOW_AUDIT_ACTIONS.consent:
        if (!hasEvaluate) issues.push("consent_without_evaluate");
        if (hasReceiptIssued) issues.push("consent_after_receipt");
        hasConsent = true;
        issuanceContext = "consent";
        preludeReady = false;
        break;

      case PARTNER_FLOW_AUDIT_ACTIONS.receiptIssued: {
        const operation = resolveIssuanceOperation(meta);
        const receiptId = metadataString(meta, "receipt_id")
          ?? (event.object_type === "decision_receipt" ? event.object_id : null);
        const replacedReceiptId = metadataString(meta, "replaced_receipt_id");

        if (operation === "refresh") {
          if (!hasEvaluate) issues.push("refresh_receipt_without_evaluate");
          if (!knownReceiptIds.size) issues.push("refresh_receipt_without_prior_receipt");
          if (replacedReceiptId && !knownReceiptIds.has(replacedReceiptId)) {
            issues.push(`refresh_receipt_unknown_replaced_id:${replacedReceiptId}`);
          }
        } else if (operation === "complete") {
          if (!hasEligibleTerminalContext(hasEvaluate, hasConsent, hasReceiptIssued)) {
            issues.push("complete_receipt_without_context");
          }
        } else if (issuanceContext !== "evaluate" && issuanceContext !== "consent") {
          issues.push("receipt_issued_without_issuance_path");
        }

        if (receiptId) knownReceiptIds.add(receiptId);
        hasReceiptIssued = true;
        issuanceContext = "none";
        preludeReady = true;
        break;
      }

      case PARTNER_FLOW_AUDIT_ACTIONS.idempotentReplay:
        if (!hasEligibleTerminalContext(hasEvaluate, hasConsent, hasReceiptIssued)) {
          issues.push("idempotent_replay_without_context");
        }
        preludeReady = true;
        break;

      case PARTNER_FLOW_AUDIT_ACTIONS.complete:
        if (!hasEligibleTerminalContext(hasEvaluate, hasConsent, hasReceiptIssued)) {
          issues.push("complete_without_eligible_context");
        } else if (!preludeReady) {
          issues.push("complete_without_prelude");
        }
        preludeReady = false;
        issuanceContext = "none";
        break;

      case PARTNER_FLOW_AUDIT_ACTIONS.refresh:
        if (!hasEvaluate) issues.push("refresh_without_evaluate");
        else if (!preludeReady) issues.push("refresh_without_prelude");
        preludeReady = false;
        break;

      default:
        sequenceActions.pop();
        break;
    }
  }

  const ok = issues.length === 0;
  if (!ok) {
    issues.push(`unexpected_event_order:${sequenceActions.join("→")}`);
  }

  return { ok, issues };
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
  const policyVersions = new Set<number>();
  const verificationRequestIds = new Set<string>();
  const decisionIds = new Set<string>();
  const receiptIds = new Set<string>();
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
    if (typeof event.policy_version === "number") policyVersions.add(event.policy_version);
    const metaPolicyVersion = meta.policy_version;
    if (typeof metaPolicyVersion === "number") policyVersions.add(metaPolicyVersion);
    if (vrId) verificationRequestIds.add(vrId);
    if (decisionId) decisionIds.add(decisionId);
    if (receiptId) receiptIds.add(receiptId);

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
  if (policyVersions.size > 1) {
    linkage_ok = false;
    issues.push(`multiple_policy_versions:${Array.from(policyVersions).join(",")}`);
  }
  if (verificationRequestIds.size > 1) {
    linkage_ok = false;
    issues.push(`multiple_verification_request_ids:${Array.from(verificationRequestIds).join(",")}`);
  }

  const receiptIssuance = validatePartnerFlowReceiptIssuance(sorted);
  if (!receiptIssuance.ok) {
    linkage_ok = false;
    issues.push(...receiptIssuance.issues);
  }

  const sequence = validatePartnerFlowSequence(sorted);
  let sequence_ok = sequence.ok;
  if (!sequence_ok) {
    issues.push(...sequence.issues);
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
