// FILE: lib/verification/audit.ts
// Append-only audit log for partner verification decisions.

import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

export async function appendAuditEvent(input: AuditEventInput): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;

  const payload = JSON.stringify({
    ...input,
    ts: new Date().toISOString(),
  });
  const event_hash = createHash("sha256").update(payload).digest("hex");

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
