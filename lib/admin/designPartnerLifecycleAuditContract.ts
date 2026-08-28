// FILE: lib/admin/designPartnerLifecycleAuditContract.ts
// Strict allowlisted contracts for lifecycle audit API and RPC envelopes.

import {
  DESIGN_PARTNER_LIFECYCLE_AUDIT_ACTIONS,
  DESIGN_PARTNER_LIFECYCLE_STATUSES,
  DESIGN_PARTNER_OPERATOR_CATEGORIES,
  isDesignPartnerLifecycleAuditAction,
  isDesignPartnerLifecycleStatus,
  isDesignPartnerOperatorCategory,
  canonicalizeLifecycleApplicationUuid,
  type DesignPartnerLifecycleAuditAction,
  type DesignPartnerLifecycleStatus,
  type DesignPartnerOperatorCategory,
} from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";
import { canonicalizeLifecycleAuditIsoTimestamp } from "@/lib/admin/designPartnerLifecycleAuditCursor";

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_OPERATOR_LABELS = [
  "Authorized operator",
  "PIN session",
  "Unknown operator",
] as const;

export type DesignPartnerLifecycleAuditOperatorLabel =
  (typeof DESIGN_PARTNER_LIFECYCLE_AUDIT_OPERATOR_LABELS)[number];

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS = [
  "event_type",
  "from_status",
  "to_status",
  "promoted_partner_id",
  "occurred_at",
  "operator_label",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS = [
  "application_id",
  "events",
  "next_cursor",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_ENVELOPE_KEYS = [
  "events",
  "next_cursor",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_EVENT_KEYS = [
  "event_type",
  "application_id",
  "from_status",
  "to_status",
  "promoted_partner_id",
  "occurred_at",
  "operator_category",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_CURSOR_KEYS = [
  "occurred_at",
  "id",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_FORBIDDEN_RESPONSE_KEYS = [
  "operator_category",
  "admin_access_method",
  "id",
  "metadata",
  "event_hash",
  "reviewer_notes",
  "email",
  "key_prefix",
  "key_hash",
  "api_key",
  "ip",
  "fingerprint",
] as const;

export interface DesignPartnerLifecycleAuditEventDto {
  event_type: DesignPartnerLifecycleAuditAction;
  from_status: DesignPartnerLifecycleStatus;
  to_status: DesignPartnerLifecycleStatus;
  promoted_partner_id: string | null;
  occurred_at: string;
  operator_label: DesignPartnerLifecycleAuditOperatorLabel;
}

export interface DesignPartnerLifecycleAuditResponse {
  application_id: string;
  events: DesignPartnerLifecycleAuditEventDto[];
  next_cursor: string | null;
}

export interface DesignPartnerLifecycleAuditRpcCursor {
  occurred_at: string;
  id: string;
}

export interface DesignPartnerLifecycleAuditRpcEvent {
  event_type: DesignPartnerLifecycleAuditAction;
  application_id: string;
  from_status: DesignPartnerLifecycleStatus;
  to_status: DesignPartnerLifecycleStatus;
  promoted_partner_id: string | null;
  occurred_at: string;
  operator_category: DesignPartnerOperatorCategory | null;
}

export interface DesignPartnerLifecycleAuditRpcEnvelope {
  events: DesignPartnerLifecycleAuditRpcEvent[];
  next_cursor: DesignPartnerLifecycleAuditRpcCursor | null;
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record);
  if (actual.length !== keys.length) return false;
  for (const key of keys) {
    if (!(key in record)) return false;
  }
  return true;
}

export function mapOperatorCategoryToLabel(
  category: DesignPartnerOperatorCategory | null,
): DesignPartnerLifecycleAuditOperatorLabel {
  if (category === "admin_authorized_email") return "Authorized operator";
  if (category === "admin_pin") return "PIN session";
  return "Unknown operator";
}

function parseRpcCursor(value: unknown): DesignPartnerLifecycleAuditRpcCursor | "invalid" {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "invalid";
  const record = value as Record<string, unknown>;
  if (!hasExactKeys(record, DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_CURSOR_KEYS)) return "invalid";
  if (typeof record.occurred_at !== "string" || typeof record.id !== "string") return "invalid";
  const occurredAt = canonicalizeLifecycleAuditIsoTimestamp(record.occurred_at);
  const id = canonicalizeLifecycleApplicationUuid(record.id);
  if (!occurredAt || !id) return "invalid";
  return { occurred_at: occurredAt, id };
}

function parseRpcEvent(value: unknown): DesignPartnerLifecycleAuditRpcEvent | "invalid" {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "invalid";
  const record = value as Record<string, unknown>;
  if (!hasExactKeys(record, DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_EVENT_KEYS)) return "invalid";

  if (typeof record.event_type !== "string" || !isDesignPartnerLifecycleAuditAction(record.event_type)) {
    return "invalid";
  }
  if (typeof record.application_id !== "string") return "invalid";
  const applicationId = canonicalizeLifecycleApplicationUuid(record.application_id);
  if (!applicationId) return "invalid";
  if (typeof record.from_status !== "string" || !isDesignPartnerLifecycleStatus(record.from_status)) {
    return "invalid";
  }
  if (typeof record.to_status !== "string" || !isDesignPartnerLifecycleStatus(record.to_status)) {
    return "invalid";
  }
  if (typeof record.occurred_at !== "string") return "invalid";
  const occurredAt = canonicalizeLifecycleAuditIsoTimestamp(record.occurred_at);
  if (!occurredAt) return "invalid";

  let promotedPartnerId: string | null = null;
  if (record.promoted_partner_id !== null) {
    if (typeof record.promoted_partner_id !== "string") return "invalid";
    promotedPartnerId = record.promoted_partner_id;
  }

  let operatorCategory: DesignPartnerOperatorCategory | null = null;
  if (record.operator_category !== null) {
    if (typeof record.operator_category !== "string") return "invalid";
    if (!isDesignPartnerOperatorCategory(record.operator_category)) return "invalid";
    operatorCategory = record.operator_category;
  }

  return {
    event_type: record.event_type,
    application_id: applicationId,
    from_status: record.from_status,
    to_status: record.to_status,
    promoted_partner_id: promotedPartnerId,
    occurred_at: occurredAt,
    operator_category: operatorCategory,
  };
}

export function parseDesignPartnerLifecycleAuditRpcEnvelope(
  value: unknown,
): DesignPartnerLifecycleAuditRpcEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_rpc_envelope");
  }
  const record = value as Record<string, unknown>;
  if (!hasExactKeys(record, DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_ENVELOPE_KEYS)) {
    throw new Error("invalid_rpc_envelope");
  }
  if (!Array.isArray(record.events)) {
    throw new Error("invalid_rpc_envelope");
  }

  const events: DesignPartnerLifecycleAuditRpcEvent[] = [];
  for (const item of record.events) {
    const parsed = parseRpcEvent(item);
    if (parsed === "invalid") {
      throw new Error("invalid_rpc_event");
    }
    events.push(parsed);
  }

  let nextCursor: DesignPartnerLifecycleAuditRpcCursor | null = null;
  if (record.next_cursor !== null) {
    const parsed = parseRpcCursor(record.next_cursor);
    if (parsed === "invalid") {
      throw new Error("invalid_rpc_cursor");
    }
    nextCursor = parsed;
  }

  return { events, next_cursor: nextCursor };
}

export function mapRpcEventToDto(
  event: DesignPartnerLifecycleAuditRpcEvent,
  expectedApplicationId: string,
): DesignPartnerLifecycleAuditEventDto {
  if (event.application_id !== expectedApplicationId) {
    throw new Error("invalid_rpc_event_application");
  }

  return {
    event_type: event.event_type,
    from_status: event.from_status,
    to_status: event.to_status,
    promoted_partner_id: event.promoted_partner_id,
    occurred_at: event.occurred_at,
    operator_label: mapOperatorCategoryToLabel(event.operator_category),
  };
}

export function buildDesignPartnerLifecycleAuditResponse(
  applicationId: string,
  events: DesignPartnerLifecycleAuditEventDto[],
  nextCursor: string | null,
): DesignPartnerLifecycleAuditResponse {
  const canonicalApplicationId = canonicalizeLifecycleApplicationUuid(applicationId);
  if (!canonicalApplicationId) {
    throw new Error("invalid_application_id");
  }

  return {
    application_id: canonicalApplicationId,
    events,
    next_cursor: nextCursor,
  };
}

export function serializeDesignPartnerLifecycleAuditResponse(
  response: DesignPartnerLifecycleAuditResponse,
): DesignPartnerLifecycleAuditResponse {
  const keys = Object.keys(response);
  if (!hasExactKeys(response as unknown as Record<string, unknown>, DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS)) {
    throw new Error("invalid_response");
  }
  if (keys.length !== DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS.length) {
    throw new Error("invalid_response");
  }

  for (const event of response.events) {
    const eventKeys = Object.keys(event);
    if (!hasExactKeys(event as unknown as Record<string, unknown>, DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS)) {
      throw new Error("invalid_response_event");
    }
    if (eventKeys.length !== DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS.length) {
      throw new Error("invalid_response_event");
    }
    if (!isDesignPartnerLifecycleAuditAction(event.event_type)) {
      throw new Error("invalid_response_event");
    }
    if (!(DESIGN_PARTNER_LIFECYCLE_AUDIT_OPERATOR_LABELS as readonly string[]).includes(event.operator_label)) {
      throw new Error("invalid_response_event");
    }
  }

  return response;
}

export function lifecycleAuditResponseContainsForbiddenKeys(payload: unknown): boolean {
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const forbidden of DESIGN_PARTNER_LIFECYCLE_AUDIT_FORBIDDEN_RESPONSE_KEYS) {
    if (serialized.includes(`"${forbidden}"`)) return true;
  }
  for (const action of DESIGN_PARTNER_LIFECYCLE_AUDIT_ACTIONS) {
    if (serialized.includes(action) && !serialized.includes(`"event_type":"${action}"`)) {
      /* event_type values are allowed */
    }
  }
  if (serialized.includes("@")) return true;
  return false;
}
