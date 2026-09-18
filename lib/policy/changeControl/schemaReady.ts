// FILE: lib/policy/changeControl/schemaReady.ts
// Fail-closed Policy Change Control schema probe. Never exposes raw database errors.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";

export const POLICY_SCHEMA_UNAVAILABLE_CODE = "policy_schema_unavailable" as const;
export const POLICY_SCHEMA_UNAVAILABLE_HTTP_STATUS = 503;

export const POLICY_CHANGE_CONTROL_SCHEMA_TABLES = [
  "partner_policy_lifecycle_audit",
  "partner_policy_adoptions",
] as const;

export const POLICY_CHANGE_CONTROL_DEPRECATE_COLUMN = "deprecate_effective_at" as const;

export interface PolicyChangeControlSchemaProbe {
  ready: boolean;
  lifecycle_audit: boolean;
  adoptions: boolean;
  deprecate_effective_at: boolean;
}

export interface PolicySchemaUnavailableResult {
  ok: false;
  code: typeof POLICY_SCHEMA_UNAVAILABLE_CODE;
  error: typeof POLICY_SCHEMA_UNAVAILABLE_CODE;
  available: false;
  feature: "policy_change_control";
  evidence?: Record<string, string | number | boolean | null>;
  application_id?: string;
  pinned_version?: number;
}

function asErrorShape(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== "object") {
    return { code: "", message: typeof error === "string" ? error : "" };
  }
  const rec = error as { code?: unknown; message?: unknown };
  return {
    code: typeof rec.code === "string" ? rec.code.trim() : "",
    message: typeof rec.message === "string" ? rec.message : "",
  };
}

/**
 * Detect missing table/column/PostgREST relation errors, including 42P01,
 * PGRST202/PGRST205, and "does not exist". Fail closed; never treat unknown
 * errors as schema-ready.
 */
export function isPolicySchemaMissingError(error: unknown): boolean {
  const { code, message } = asErrorShape(error);
  const lower = message.toLowerCase();
  if (
    code === "42P01"
    || code === "PGRST202"
    || code === "PGRST205"
    || code === "PGRST204"
  ) {
    return true;
  }
  if (!lower) return false;
  return (
    lower.includes("does not exist")
    || lower.includes("schema cache")
    || lower.includes("could not find the table")
    || lower.includes("could not find the relationship")
    || (lower.includes("could not find the") && lower.includes("column"))
    || lower.includes("undefined table")
    || lower.includes("undefined column")
  );
}

async function relationExists(
  client: SupabaseClient,
  table: string,
  column?: string,
): Promise<boolean> {
  const select = column ?? "*";
  const { error } = await client
    .from(table)
    .select(select, { head: true, count: "exact" })
    .limit(0);
  if (!error) return true;
  return false;
}

export function policySchemaUnavailableResult(
  extra?: {
    application_id?: string;
    pinned_version?: number;
    evidence?: Record<string, string | number | boolean | null>;
  },
): PolicySchemaUnavailableResult {
  return {
    ok: false,
    code: POLICY_SCHEMA_UNAVAILABLE_CODE,
    error: POLICY_SCHEMA_UNAVAILABLE_CODE,
    available: false,
    feature: "policy_change_control",
    ...(extra?.application_id ? { application_id: extra.application_id } : {}),
    ...(extra?.pinned_version != null ? { pinned_version: extra.pinned_version } : {}),
    ...(extra?.evidence ? { evidence: extra.evidence } : {}),
  };
}

export async function probePolicyChangeControlSchema(
  client?: SupabaseClient | null,
): Promise<PolicyChangeControlSchemaProbe> {
  const sb = client ?? getSupabaseAdmin();
  if (!sb) {
    return {
      ready: false,
      lifecycle_audit: false,
      adoptions: false,
      deprecate_effective_at: false,
    };
  }

  const [lifecycle_audit, adoptions, deprecate_effective_at] = await Promise.all([
    relationExists(sb, "partner_policy_lifecycle_audit"),
    relationExists(sb, "partner_policy_adoptions"),
    relationExists(sb, "partner_policies", POLICY_CHANGE_CONTROL_DEPRECATE_COLUMN),
  ]);

  return {
    ready: lifecycle_audit && adoptions && deprecate_effective_at,
    lifecycle_audit,
    adoptions,
    deprecate_effective_at,
  };
}

export async function assertPolicyChangeControlSchemaReady(
  client?: SupabaseClient | null,
): Promise<void> {
  const probe = await probePolicyChangeControlSchema(client);
  if (!probe.ready) {
    throw new PolicyChangeControlError(POLICY_SCHEMA_UNAVAILABLE_CODE);
  }
}
