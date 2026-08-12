// FILE: scripts/demo/lib/demoPostgrestError.ts
// Sanitized PostgREST / Postgres error classification for demo validators.

export type PostgrestErrorCategory =
  | "table_missing"
  | "permission_denied"
  | "schema_cache_unavailable"
  | "unknown_query_error";

export interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

export interface ClassifiedPostgrestError {
  category: PostgrestErrorCategory;
  code: string;
  detail: string;
}

const SCHEMA_CACHE_CODES = new Set(["PGRST204", "PGRST205"]);

function normalizedCode(error: PostgrestErrorLike | null | undefined): string {
  const code = error?.code?.trim();
  return code && code.length > 0 ? code : "unknown";
}

function normalizedMessage(error: PostgrestErrorLike | null | undefined): string {
  return error?.message?.trim() ?? "";
}

function messageIndicatesMissingTable(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist")
    || lower.includes("relation ")
    || lower.includes("undefined table")
  );
}

function messageIndicatesPermissionDenied(message: string): boolean {
  return message.toLowerCase().includes("permission denied");
}

function messageIndicatesSchemaCache(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache")
    || lower.includes("not found in the schema cache")
    || lower.includes("could not find the table")
  );
}

export function classifyPostgrestError(
  error: PostgrestErrorLike | null | undefined,
): ClassifiedPostgrestError {
  const code = normalizedCode(error);
  const message = normalizedMessage(error);

  if (code === "42P01" || messageIndicatesMissingTable(message)) {
    return {
      category: "table_missing",
      code,
      detail: "Required table not found via PostgREST",
    };
  }

  if (code === "42501" || messageIndicatesPermissionDenied(message)) {
    return {
      category: "permission_denied",
      code,
      detail: "Role lacks table privilege (not an RLS policy outcome)",
    };
  }

  if (SCHEMA_CACHE_CODES.has(code) || messageIndicatesSchemaCache(message)) {
    return {
      category: "schema_cache_unavailable",
      code,
      detail: "Table is not exposed to the Data API schema cache",
    };
  }

  if (message.length > 0) {
    return {
      category: "unknown_query_error",
      code,
      detail: `PostgREST query failed [${code}]`,
    };
  }

  return {
    category: "unknown_query_error",
    code,
    detail: `PostgREST query failed [${code}]`,
  };
}

export function formatClassifiedPostgrestError(error: ClassifiedPostgrestError): string {
  return `${error.category} [${error.code}]: ${error.detail}`;
}
