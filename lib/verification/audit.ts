// FILE: lib/verification/audit.ts
// Append-only audit log for partner verification decisions.

import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";

export interface AuditEventInput {
  actor_type: string;
  actor_id?: string | null;
  action: string;
  object_type?: string | null;
  object_id?: string | null;
  policy_id?: string | null;
  policy_version?: number | null;
  metadata?: Record<string, unknown>;
}

export async function appendAuditEvent(
  input: AuditEventInput,
  transaction?: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
): Promise<string | null> {
  const payload = JSON.stringify({
    ...input,
    ts: new Date().toISOString(),
  });
  const event_hash = createHash("sha256").update(payload).digest("hex");

  if (persistenceUsesDirectPostgres()) {
    const sql = `insert into public.audit_events
      (actor_type, actor_id, action, object_type, object_id, policy_id,
       policy_version, metadata, event_hash)
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      returning id::text as id`;
    const params = [input.actor_type, input.actor_id ?? null, input.action,
      input.object_type ?? null, input.object_id ?? null, input.policy_id ?? null,
      input.policy_version ?? null, JSON.stringify(input.metadata ?? {}), event_hash];
    const result = transaction ? await transaction.query(sql, params)
      : await queryAbraxasPg<{ id: string }>(sql, params);
    if (typeof result.rows[0]?.id !== "string") throw new Error("audit_persistence_unavailable");
    return result.rows[0].id;
  }

  const sb = getSupabaseAdmin();
  if (!sb) return null;

  const { data, error } = await sb.from("audit_events").insert({
    actor_type: input.actor_type,
    actor_id: input.actor_id ?? null,
    action: input.action,
    object_type: input.object_type ?? null,
    object_id: input.object_id ?? null,
    policy_id: input.policy_id ?? null,
    policy_version: input.policy_version ?? null,
    metadata: input.metadata ?? {},
    event_hash,
  }).select("id").single();

  if (error) {
    console.error("[audit]", error.message);
    return null;
  }
  return data?.id as string;
}
