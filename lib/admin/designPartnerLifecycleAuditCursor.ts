// FILE: lib/admin/designPartnerLifecycleAuditCursor.ts
// Opaque position tokens and query validation for lifecycle audit pagination.

import { canonicalizeLifecycleApplicationUuid } from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_ALLOWED_QUERY_KEYS = [
  "limit",
  "cursor",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_DEFAULT_LIMIT = 25;
export const DESIGN_PARTNER_LIFECYCLE_AUDIT_MAX_LIMIT = 25;
export const DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH = 512;
export const DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_DECODED_LENGTH = 256;
export const DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_VERSION = 1 as const;

const LIMIT_PATTERN = /^(?:[1-9]|1[0-9]|2[0-5])$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CURSOR_PAYLOAD_KEYS = ["v", "a", "o", "i"] as const;

export interface DesignPartnerLifecycleAuditCursorPosition {
  version: typeof DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_VERSION;
  applicationId: string;
  occurredAt: string;
  id: string;
}

export type DesignPartnerLifecycleAuditQueryErrorCode = "invalid_input" | "invalid_cursor";

export interface DesignPartnerLifecycleAuditQueryParams {
  limit: number;
  cursor: DesignPartnerLifecycleAuditCursorPosition | null;
}

export function canonicalizeLifecycleAuditIsoTimestamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const iso = date.toISOString();
  if (iso !== value) return null;
  return iso;
}

export function canonicalizeLifecycleAuditUuid(value: string): string | null {
  if (!UUID_PATTERN.test(value)) return null;
  if (value !== value.toLowerCase()) return null;
  return value;
}

export function parseDesignPartnerLifecycleAuditLimit(raw: string | null): number | "invalid" {
  if (raw === null) return DESIGN_PARTNER_LIFECYCLE_AUDIT_DEFAULT_LIMIT;
  if (!LIMIT_PATTERN.test(raw)) return "invalid";
  return Number(raw);
}

function parseCursorPayloadObject(
  value: unknown,
): DesignPartnerLifecycleAuditCursorPosition | "invalid_cursor" {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "invalid_cursor";
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== CURSOR_PAYLOAD_KEYS.length) return "invalid_cursor";
  for (const key of CURSOR_PAYLOAD_KEYS) {
    if (!(key in record)) return "invalid_cursor";
  }
  if (record.v !== DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_VERSION) return "invalid_cursor";
  if (typeof record.a !== "string" || typeof record.o !== "string" || typeof record.i !== "string") {
    return "invalid_cursor";
  }

  const applicationId = canonicalizeLifecycleApplicationUuid(record.a);
  if (!applicationId || applicationId !== record.a) return "invalid_cursor";
  const occurredAt = canonicalizeLifecycleAuditIsoTimestamp(record.o);
  const id = canonicalizeLifecycleAuditUuid(record.i);
  if (!applicationId || !occurredAt || !id) return "invalid_cursor";

  return {
    version: DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_VERSION,
    applicationId,
    occurredAt,
    id,
  };
}

export function encodeDesignPartnerLifecycleAuditCursor(
  applicationId: string,
  occurredAt: string,
  id: string,
): string {
  const canonicalApplicationId = canonicalizeLifecycleApplicationUuid(applicationId);
  const canonicalOccurredAt = canonicalizeLifecycleAuditIsoTimestamp(occurredAt);
  const canonicalId = canonicalizeLifecycleAuditUuid(id);
  if (!canonicalApplicationId || !canonicalOccurredAt || !canonicalId) {
    throw new Error("invalid_cursor_source");
  }
  const payload = {
    v: DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_VERSION,
    a: canonicalApplicationId,
    o: canonicalOccurredAt,
    i: canonicalId,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  if (encoded.length > DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH) {
    throw new Error("invalid_cursor_source");
  }
  return encoded;
}

export function decodeDesignPartnerLifecycleAuditCursor(
  encoded: string,
): DesignPartnerLifecycleAuditCursorPosition | "invalid_cursor" {
  if (!encoded || encoded.length > DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH) {
    return "invalid_cursor";
  }

  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return "invalid_cursor";
  }

  if (!decoded || decoded.length > DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_DECODED_LENGTH) {
    return "invalid_cursor";
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return "invalid_cursor";
  }

  return parseCursorPayloadObject(parsed);
}

export function validateDesignPartnerLifecycleAuditQuery(
  searchParams: URLSearchParams,
  applicationId: string,
): { ok: true; value: DesignPartnerLifecycleAuditQueryParams } | { ok: false; code: DesignPartnerLifecycleAuditQueryErrorCode } {
  for (const key of Array.from(searchParams.keys())) {
    if (!(DESIGN_PARTNER_LIFECYCLE_AUDIT_ALLOWED_QUERY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, code: "invalid_input" };
    }
  }

  for (const key of DESIGN_PARTNER_LIFECYCLE_AUDIT_ALLOWED_QUERY_KEYS) {
    if (searchParams.getAll(key).length > 1) {
      return { ok: false, code: "invalid_input" };
    }
  }

  const limit = parseDesignPartnerLifecycleAuditLimit(searchParams.get("limit"));
  if (limit === "invalid") {
    return { ok: false, code: "invalid_input" };
  }

  const cursorRaw = searchParams.get("cursor");
  let cursor: DesignPartnerLifecycleAuditCursorPosition | null = null;
  if (cursorRaw !== null) {
    if (cursorRaw === "") {
      return { ok: false, code: "invalid_cursor" };
    }
    const decoded = decodeDesignPartnerLifecycleAuditCursor(cursorRaw);
    if (decoded === "invalid_cursor") {
      return { ok: false, code: "invalid_cursor" };
    }
    if (decoded.applicationId !== applicationId) {
      return { ok: false, code: "invalid_cursor" };
    }
    cursor = decoded;
  }

  return {
    ok: true,
    value: {
      limit,
      cursor,
    },
  };
}
