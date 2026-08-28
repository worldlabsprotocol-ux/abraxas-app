// FILE: lib/admin/designPartnerAdminActor.ts
// Server-side admin actor derivation for design-partner lifecycle mutations.

import type { NextRequest } from "next/server";
import { resolveAdminActorCategory, type AdminActorCategory } from "@/lib/admin/adminActorCategory";
import { resolveAdminAccess } from "@/lib/adminAuth";

export const DESIGN_PARTNER_FORBIDDEN_CLIENT_MUTATION_FIELDS = [
  "actor_category",
  "admin_access_method",
  "audit_event_id",
  "event_hash",
  "metadata",
  "operator_category",
  "operator_label",
  "promoted_partner_id",
  "key_hash",
  "key_prefix",
  "api_key",
  "application",
  "audit_event",
  "expected_audit_hash",
  "lifecycle_snapshot",
] as const;

export async function resolveDesignPartnerAdminActorCategory(
  req: NextRequest,
): Promise<AdminActorCategory> {
  const access = await resolveAdminAccess(req);
  return resolveAdminActorCategory(access.method);
}

export function recordContainsForbiddenClientMutationFields(
  record: Record<string, unknown>,
): boolean {
  for (const key of DESIGN_PARTNER_FORBIDDEN_CLIENT_MUTATION_FIELDS) {
    if (key in record) return true;
  }
  return false;
}

export function hasOnlyAllowlistedKeys(
  record: Record<string, unknown>,
  allowlist: readonly string[],
): boolean {
  const keys = Object.keys(record);
  if (keys.length === 0 || keys.length > allowlist.length) return false;
  for (const key of keys) {
    if (!allowlist.includes(key)) return false;
  }
  return true;
}
