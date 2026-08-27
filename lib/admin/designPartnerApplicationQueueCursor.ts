// FILE: lib/admin/designPartnerApplicationQueueCursor.ts
// Opaque position tokens and query validation for design-partner queue pagination.

export const DESIGN_PARTNER_QUEUE_STATUS_FILTERS = [
  "submitted",
  "approved",
  "rejected",
  "onboarded",
  "all",
] as const;

export type DesignPartnerQueueStatusFilter =
  (typeof DESIGN_PARTNER_QUEUE_STATUS_FILTERS)[number];

export const DESIGN_PARTNER_QUEUE_ALLOWED_QUERY_KEYS = [
  "status",
  "limit",
  "cursor",
] as const;

export const DESIGN_PARTNER_QUEUE_DEFAULT_LIMIT = 25;
export const DESIGN_PARTNER_QUEUE_MAX_LIMIT = 50;
export const DESIGN_PARTNER_QUEUE_CURSOR_MAX_ENCODED_LENGTH = 512;
export const DESIGN_PARTNER_QUEUE_CURSOR_MAX_DECODED_LENGTH = 256;
export const DESIGN_PARTNER_QUEUE_CURSOR_VERSION = 1 as const;

const LIMIT_PATTERN = /^(?:[1-9]|[1-4][0-9]|50)$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CURSOR_PAYLOAD_KEYS = ["v", "f", "c", "i"] as const;

export interface DesignPartnerQueueCursorPosition {
  version: typeof DESIGN_PARTNER_QUEUE_CURSOR_VERSION;
  filter: DesignPartnerQueueStatusFilter;
  createdAt: string;
  id: string;
}

export type DesignPartnerQueueQueryErrorCode = "invalid_input" | "invalid_cursor";

export interface DesignPartnerQueueQueryParams {
  status: DesignPartnerQueueStatusFilter;
  limit: number;
  cursor: DesignPartnerQueueCursorPosition | null;
}

function isStatusFilter(value: string): value is DesignPartnerQueueStatusFilter {
  return (DESIGN_PARTNER_QUEUE_STATUS_FILTERS as readonly string[]).includes(value);
}

export function canonicalizeQueueIsoTimestamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const iso = date.toISOString();
  if (iso !== value) return null;
  return iso;
}

export function canonicalizeQueueUuid(value: string): string | null {
  if (!UUID_PATTERN.test(value)) return null;
  return value.toLowerCase();
}

export function parseDesignPartnerQueueLimit(raw: string | null): number | "invalid" {
  if (raw === null) return DESIGN_PARTNER_QUEUE_DEFAULT_LIMIT;
  if (!LIMIT_PATTERN.test(raw)) return "invalid";
  return Number(raw);
}

function parseCursorPayloadObject(
  value: unknown,
): DesignPartnerQueueCursorPosition | "invalid_cursor" {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "invalid_cursor";
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== CURSOR_PAYLOAD_KEYS.length) return "invalid_cursor";
  for (const key of CURSOR_PAYLOAD_KEYS) {
    if (!(key in record)) return "invalid_cursor";
  }
  if (record.v !== DESIGN_PARTNER_QUEUE_CURSOR_VERSION) return "invalid_cursor";
  if (typeof record.f !== "string" || !isStatusFilter(record.f)) return "invalid_cursor";
  if (typeof record.c !== "string" || typeof record.i !== "string") return "invalid_cursor";

  const createdAt = canonicalizeQueueIsoTimestamp(record.c);
  const id = canonicalizeQueueUuid(record.i);
  if (!createdAt || !id) return "invalid_cursor";

  return {
    version: DESIGN_PARTNER_QUEUE_CURSOR_VERSION,
    filter: record.f,
    createdAt,
    id,
  };
}

export function encodeDesignPartnerQueueCursor(
  filter: DesignPartnerQueueStatusFilter,
  createdAt: string,
  id: string,
): string {
  const canonicalCreatedAt = canonicalizeQueueIsoTimestamp(createdAt);
  const canonicalId = canonicalizeQueueUuid(id);
  if (!canonicalCreatedAt || !canonicalId) {
    throw new Error("invalid_cursor_source");
  }
  const payload = {
    v: DESIGN_PARTNER_QUEUE_CURSOR_VERSION,
    f: filter,
    c: canonicalCreatedAt,
    i: canonicalId,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  if (encoded.length > DESIGN_PARTNER_QUEUE_CURSOR_MAX_ENCODED_LENGTH) {
    throw new Error("invalid_cursor_source");
  }
  return encoded;
}

export function decodeDesignPartnerQueueCursor(
  encoded: string,
): DesignPartnerQueueCursorPosition | "invalid_cursor" {
  if (!encoded || encoded.length > DESIGN_PARTNER_QUEUE_CURSOR_MAX_ENCODED_LENGTH) {
    return "invalid_cursor";
  }

  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return "invalid_cursor";
  }

  if (!decoded || decoded.length > DESIGN_PARTNER_QUEUE_CURSOR_MAX_DECODED_LENGTH) {
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

export function buildDesignPartnerQueueKeysetOrFilter(
  createdAt: string,
  id: string,
): string {
  const canonicalCreatedAt = canonicalizeQueueIsoTimestamp(createdAt);
  const canonicalId = canonicalizeQueueUuid(id);
  if (!canonicalCreatedAt || !canonicalId) {
    throw new Error("invalid_keyset_source");
  }
  return `created_at.lt."${canonicalCreatedAt}",and(created_at.eq."${canonicalCreatedAt}",id.lt."${canonicalId}")`;
}

export function validateDesignPartnerQueueQuery(
  searchParams: URLSearchParams,
): { ok: true; value: DesignPartnerQueueQueryParams } | { ok: false; code: DesignPartnerQueueQueryErrorCode } {
  for (const key of Array.from(searchParams.keys())) {
    if (!(DESIGN_PARTNER_QUEUE_ALLOWED_QUERY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, code: "invalid_input" };
    }
  }

  for (const key of DESIGN_PARTNER_QUEUE_ALLOWED_QUERY_KEYS) {
    if (searchParams.getAll(key).length > 1) {
      return { ok: false, code: "invalid_input" };
    }
  }

  const statusRaw = searchParams.get("status");
  if (!statusRaw || !isStatusFilter(statusRaw)) {
    return { ok: false, code: "invalid_input" };
  }

  const limit = parseDesignPartnerQueueLimit(searchParams.get("limit"));
  if (limit === "invalid") {
    return { ok: false, code: "invalid_input" };
  }

  const cursorRaw = searchParams.get("cursor");
  let cursor: DesignPartnerQueueCursorPosition | null = null;
  if (cursorRaw !== null) {
    if (cursorRaw === "") {
      return { ok: false, code: "invalid_cursor" };
    }
    const decoded = decodeDesignPartnerQueueCursor(cursorRaw);
    if (decoded === "invalid_cursor") {
      return { ok: false, code: "invalid_cursor" };
    }
    if (decoded.filter !== statusRaw) {
      return { ok: false, code: "invalid_cursor" };
    }
    cursor = decoded;
  }

  return {
    ok: true,
    value: {
      status: statusRaw,
      limit,
      cursor,
    },
  };
}
