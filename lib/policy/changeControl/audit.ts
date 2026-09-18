// FILE: lib/policy/changeControl/audit.ts
// Append-only policy lifecycle audit. Metadata must never include PII or secrets.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { PolicyLifecycleAuditEvent } from "@/lib/policy/changeControl/codes";

const FORBIDDEN_METADATA_KEYS = [
  "email",
  "date_of_birth",
  "dob",
  "legal_name",
  "document",
  "passport",
  "selfie",
  "wallet",
  "oauth",
  "id_token",
  "jwt",
  "secret",
  "api_key",
];

export function sanitizePolicyAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_METADATA_KEYS.some((forbidden) => lower.includes(forbidden))) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value == null) {
      out[key] = value;
    }
  }
  return out;
}

export async function appendPolicyLifecycleAudit(input: {
  policyId: string;
  version: number;
  partnerId: string;
  eventType: PolicyLifecycleAuditEvent;
  actorType?: "partner" | "operator" | "system";
  actorId?: string | null;
  applicationId?: string | null;
  fromVersion?: number | null;
  toVersion?: number | null;
  safeCode?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("partner_policy_lifecycle_audit").insert({
    policy_id: input.policyId,
    version: input.version,
    partner_id: input.partnerId,
    event_type: input.eventType,
    actor_type: input.actorType ?? "partner",
    actor_id: input.actorId ?? null,
    application_id: input.applicationId ?? null,
    from_version: input.fromVersion ?? null,
    to_version: input.toVersion ?? null,
    safe_code: input.safeCode ?? null,
    metadata: sanitizePolicyAuditMetadata(input.metadata),
  });
  if (error) throw new Error(error.message);
}

export async function listPolicyLifecycleAudit(input: {
  policyId: string;
  partnerId: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  event_type: PolicyLifecycleAuditEvent;
  version: number;
  from_version: number | null;
  to_version: number | null;
  application_id: string | null;
  safe_code: string | null;
  created_at: string;
}>> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_policy_lifecycle_audit")
    .select("id, event_type, version, from_version, to_version, application_id, safe_code, created_at")
    .eq("policy_id", input.policyId)
    .eq("partner_id", input.partnerId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    event_type: PolicyLifecycleAuditEvent;
    version: number;
    from_version: number | null;
    to_version: number | null;
    application_id: string | null;
    safe_code: string | null;
    created_at: string;
  }>;
}
