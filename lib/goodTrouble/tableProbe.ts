// FILE: lib/goodTrouble/tableProbe.ts
// PostgREST table existence probes for production readiness. Fail closed without false MISSING.

import type { SupabaseClient } from "@supabase/supabase-js";

export type TableProbeState = "exists" | "missing" | "unknown";

export interface TableProbeDiagnostic {
  code: string;
  category:
    | "schema_cache_unavailable"
    | "permission_denied"
    | "authentication_failed"
    | "authorization_denied"
    | "network_or_transport_failure"
    | "invalid_credential"
    | "table_missing"
    | "unknown_query_error";
  fingerprint: string;
}

export interface TableProbeResult {
  state: TableProbeState;
  detail: string;
  diagnostic?: TableProbeDiagnostic;
}

interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const SCHEMA_CACHE_CODES = new Set(["PGRST204", "PGRST205"]);
const JWT_ERROR_CODES = new Set(["PGRST300", "PGRST301", "PGRST302", "PGRST303"]);

function safeFingerprint(category: string, code: string, table: string): string {
  const payload = `${category}|${code}|head_count|${table}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 12);
}

function normalizedCode(error: PostgrestErrorLike | null | undefined): string {
  const code = error?.code?.trim();
  return code && code.length > 0 ? code : "unknown";
}

function normalizedMessage(error: PostgrestErrorLike | null | undefined): string {
  return error?.message?.trim().toLowerCase() ?? "";
}

function messageIndicatesPostgresMissingRelation(message: string): boolean {
  return (
    /relation\s+"[^"]+"\s+does not exist/.test(message)
    || message.includes("undefined table")
  );
}

function messageIndicatesSchemaCache(message: string): boolean {
  return (
    message.includes("schema cache")
    || message.includes("not found in the schema cache")
    || message.includes("could not find the table")
  );
}

function messageIndicatesPermissionDenied(message: string): boolean {
  return message.includes("permission denied");
}

function messageIndicatesMalformedCredential(message: string): boolean {
  return (
    message.includes("invalid jwt")
    || message.includes("jwt malformed")
    || message.includes("unable to parse")
    || message.includes("compact serialization")
  );
}

function classifyProbeError(error: PostgrestErrorLike, table: string): TableProbeResult {
  const code = normalizedCode(error);
  const message = normalizedMessage(error);

  if (code === "42P01" || messageIndicatesPostgresMissingRelation(message)) {
    const category = "table_missing" as const;
    return {
      state: "missing",
      detail: `${table} is not reachable via PostgREST (confirmed missing relation).`,
      diagnostic: { code, category, fingerprint: safeFingerprint(category, code, table) },
    };
  }

  if (code === "42501" || messageIndicatesPermissionDenied(message)) {
    const category = "permission_denied" as const;
    return {
      state: "unknown",
      detail: `${table} probe inconclusive: PostgREST permission denied [${code}].`,
      diagnostic: { code, category, fingerprint: safeFingerprint(category, code, table) },
    };
  }

  if (SCHEMA_CACHE_CODES.has(code) || messageIndicatesSchemaCache(message)) {
    const category = "schema_cache_unavailable" as const;
    return {
      state: "unknown",
      detail: `${table} probe inconclusive: table not visible in PostgREST schema cache [${code}].`,
      diagnostic: { code, category, fingerprint: safeFingerprint(category, code, table) },
    };
  }

  if (JWT_ERROR_CODES.has(code) || messageIndicatesMalformedCredential(message)) {
    const category = code === "unknown" && messageIndicatesMalformedCredential(message)
      ? "invalid_credential" as const
      : "authentication_failed" as const;
    return {
      state: "unknown",
      detail: `${table} probe inconclusive: PostgREST rejected credentials [${code}].`,
      diagnostic: { code, category, fingerprint: safeFingerprint(category, code, table) },
    };
  }

  const category = "unknown_query_error" as const;
  return {
    state: "unknown",
    detail: `${table} probe inconclusive: PostgREST query failed [${code}].`,
    diagnostic: { code, category, fingerprint: safeFingerprint(category, code, table) },
  };
}

export function classifyTableProbeError(
  error: PostgrestErrorLike | null | undefined,
  table: string,
): TableProbeResult {
  if (!error) {
    return {
      state: "exists",
      detail: `${table} is reachable via PostgREST.`,
    };
  }
  return classifyProbeError(error, table);
}

/** Read-only PostgREST probe. Does not mutate data. */
export async function probeSupabaseTable(
  client: SupabaseClient,
  table: string,
): Promise<TableProbeResult> {
  const { error } = await client
    .from(table)
    .select("id", { head: true, count: "exact" })
    .limit(0);

  if (!error) {
    return {
      state: "exists",
      detail: `${table} is reachable via PostgREST.`,
    };
  }

  return classifyProbeError(error, table);
}

export function tableProbeToReadinessStatus(state: TableProbeState): "PASS" | "FAIL" | "UNKNOWN" {
  if (state === "exists") return "PASS";
  if (state === "missing") return "FAIL";
  return "UNKNOWN";
}
