// FILE: lib/admin/partnerOnboardingAudit.ts
// Non-PII audit metadata for admin partner configuration changes.

import type { NextRequest } from "next/server";
import { appendAuditEvent } from "@/lib/verification/audit";
import { resolveAdminAccess } from "@/lib/adminAuth";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";

export async function logAdminPartnerConfigAudit(
  req: NextRequest,
  input: {
    action: string;
    object_type: string;
    object_id: string;
    policy_id?: string | null;
    policy_version?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const access = await resolveAdminAccess(req);
  const actorId = resolveAdminActorCategory(access.method);

  await appendAuditEvent({
    actor_type: "admin_operator",
    actor_id: actorId,
    action: input.action,
    object_type: input.object_type,
    object_id: input.object_id,
    policy_id: input.policy_id ?? null,
    policy_version: input.policy_version ?? null,
    metadata: {
      admin_access_method: access.method,
      ...input.metadata,
    },
  });
}
