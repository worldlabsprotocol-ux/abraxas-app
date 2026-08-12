// FILE: scripts/demo/lib/demoPostgrestError.ts
// Sanitized PostgREST / Postgres error classification for demo validators.

import { createHash } from "node:crypto";

export type PostgrestErrorCategory =
  | "table_missing"
  | "permission_denied"
  | "schema_cache_unavailable"
  | "authentication_failed"
  | "authorization_denied"
  | "network_or_transport_failure"
  | "invalid_credential"
  | "unknown_query_error";

export interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  name?: string | null;
}

export interface RestProbeContext {
  operation: string;
  table?: string;
  httpStatus?: number | null;
}

export interface ClassifiedPostgrestError {
  category: PostgrestErrorCategory;
  code: string;
  detail: string;
  httpStatus?: number | null;
  operation?: string;
  table?: string;
  fingerprint: string;
}

const SCHEMA_CACHE_CODES = new Set(["PGRST204", "PGRST205"]);
const JWT_ERROR_CODES = new Set(["PGRST300", "PGRST301", "PGRST302", "PGRST303"]);
const ALLOWLISTED_OUTPUT_CODES = new Set([
  "unknown",
  "42P01",
  "42501",
  "PGRST116",
  "PGRST204",
  "PGRST205",
  "PGRST300",
  "PGRST301",
  "PGRST302",
  "PGRST303",
]);

function sanitizeCodeForOutput(code: string): string {
  return ALLOWLISTED_OUTPUT_CODES.has(code) ? code : "unknown";
}

function sanitizeHttpStatusForOutput(httpStatus?: number | null): number | null | undefined {
  if (httpStatus === undefined || httpStatus === null) {
    return httpStatus;
  }
  if (!Number.isInteger(httpStatus) || httpStatus < 0 || httpStatus > 599) {
    return undefined;
  }
  return httpStatus;
}

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

function messageIndicatesMalformedCredential(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid jwt")
    || lower.includes("jwt malformed")
    || lower.includes("unable to parse")
    || lower.includes("compact serialization")
  );
}

export function computeSafeRestProbeFingerprint(input: {
  category: PostgrestErrorCategory;
  code: string;
  httpStatus?: number | null;
  operation?: string;
  table?: string;
}): string {
  const payload = [
    input.category,
    input.code,
    input.httpStatus ?? "na",
    input.operation ?? "na",
    input.table ?? "na",
  ].join("|");
  const hasher = createHash("sha256");
  hasher.write(payload);
  return hasher.digest("hex").slice(0, 12);
}

function buildClassified(input: {
  category: PostgrestErrorCategory;
  code: string;
  detail: string;
  context?: RestProbeContext;
}): ClassifiedPostgrestError {
  const httpStatus = input.context?.httpStatus;
  const operation = input.context?.operation;
  const table = input.context?.table;
  return {
    category: input.category,
    code: input.code,
    detail: input.detail,
    httpStatus,
    operation,
    table,
    fingerprint: computeSafeRestProbeFingerprint({
      category: input.category,
      code: input.code,
      httpStatus,
      operation,
      table,
    }),
  };
}

export function classifyPostgrestProbeError(
  error: PostgrestErrorLike | null | undefined,
  context?: RestProbeContext,
): ClassifiedPostgrestError {
  const code = normalizedCode(error);
  const message = normalizedMessage(error);
  const httpStatus = context?.httpStatus;

  if (httpStatus === 0) {
    return buildClassified({
      category: "network_or_transport_failure",
      code,
      detail: "REST transport failed before PostgREST returned a response",
      context,
    });
  }

  if (JWT_ERROR_CODES.has(code)) {
    return buildClassified({
      category: "authentication_failed",
      code,
      detail: "PostgREST rejected the service-role JWT",
      context,
    });
  }

  if (code === "42P01" || messageIndicatesMissingTable(message)) {
    return buildClassified({
      category: "table_missing",
      code,
      detail: "Required table not found via PostgREST",
      context,
    });
  }

  if (code === "42501" || messageIndicatesPermissionDenied(message)) {
    return buildClassified({
      category: "permission_denied",
      code,
      detail: "Role lacks table privilege (not an RLS policy outcome)",
      context,
    });
  }

  if (SCHEMA_CACHE_CODES.has(code) || messageIndicatesSchemaCache(message)) {
    return buildClassified({
      category: "schema_cache_unavailable",
      code,
      detail: "Table is not exposed to the Data API schema cache",
      context,
    });
  }

  if (httpStatus === 401 || (httpStatus === 403 && code === "unknown" && message.length === 0)) {
    const category = httpStatus === 403 ? "authorization_denied" : "authentication_failed";
    return buildClassified({
      category,
      code,
      detail: category === "authorization_denied"
        ? "REST request forbidden before table probe completed"
        : "REST request unauthorized before table probe completed",
      context,
    });
  }

  if (httpStatus === 403) {
    return buildClassified({
      category: "authorization_denied",
      code,
      detail: "REST request forbidden before table probe completed",
      context,
    });
  }

  if (
    code === "unknown"
    && (httpStatus === 401 || messageIndicatesMalformedCredential(message))
  ) {
    return buildClassified({
      category: "invalid_credential",
      code,
      detail: "Service-role credential rejected for this project",
      context,
    });
  }

  return buildClassified({
    category: "unknown_query_error",
    code,
    detail: `PostgREST query failed [${code}]`,
    context,
  });
}

/** @deprecated Use classifyPostgrestProbeError for REST probes with HTTP context. */
export function classifyPostgrestError(
  error: PostgrestErrorLike | null | undefined,
): ClassifiedPostgrestError {
  return classifyPostgrestProbeError(error);
}

export function formatClassifiedPostgrestError(error: ClassifiedPostgrestError): string {
  return formatRestProbeDiagnostic(error);
}

export function formatRestProbeDiagnostic(error: ClassifiedPostgrestError): string {
  const safeCode = sanitizeCodeForOutput(error.code);
  const safeHttpStatus = sanitizeHttpStatusForOutput(error.httpStatus);
  const parts = [
    `${error.category} [${safeCode}]`,
    safeHttpStatus !== undefined && safeHttpStatus !== null ? `http=${safeHttpStatus}` : undefined,
    error.operation ? `op=${error.operation}` : undefined,
    error.table ? `table=${error.table}` : undefined,
    `fp=${error.fingerprint}`,
    error.detail,
  ].filter(Boolean);
  return parts.join(" ");
}
