// FILE: lib/verification/auditEventHash.ts
// Lifecycle-specific audit hash serialization (does not replace appendAuditEvent).

import { createHash } from "crypto";
import {
  assertSafeAsciiLifecycleToken,
  buildDesignPartnerLifecycleAuditMetadata,
  canonicalizeLifecycleApplicationUuid,
  isDesignPartnerLifecycleAuditAction,
  isDesignPartnerOperatorCategory,
  mapOperatorCategoryToAccessMethod,
  type DesignPartnerLifecycleAuditAction,
  type DesignPartnerLifecycleAuditMetadata,
  type DesignPartnerOperatorCategory,
} from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";

export const LIFECYCLE_AUDIT_OBJECT_TYPE = "design_partner_application" as const;
export const LIFECYCLE_AUDIT_ACTOR_TYPE = "admin_operator" as const;

export interface LifecycleAuditHashInput {
  actorCategory: DesignPartnerOperatorCategory;
  action: DesignPartnerLifecycleAuditAction;
  applicationId: string;
  fromStatus: DesignPartnerLifecycleAuditMetadata["from_status"];
  toStatus: DesignPartnerLifecycleAuditMetadata["to_status"];
  promotedPartnerId?: string | null;
  ts: string;
}

function assertIsoUtcMilliseconds(ts: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ts)) {
    throw new Error("invalid_lifecycle_ts");
  }
}

function serializeMetadataObject(metadata: DesignPartnerLifecycleAuditMetadata): string {
  const parts = [
    `"from_status":"${metadata.from_status}"`,
    `"to_status":"${metadata.to_status}"`,
    `"admin_access_method":"${metadata.admin_access_method}"`,
  ];
  if (metadata.promoted_partner_id) {
    parts.push(`"promoted_partner_id":"${metadata.promoted_partner_id}"`);
  }
  return `{${parts.join(",")}}`;
}

export function serializeLifecycleAuditHashPayload(input: LifecycleAuditHashInput): string {
  if (!isDesignPartnerOperatorCategory(input.actorCategory)) {
    throw new Error("invalid_lifecycle_actor_category");
  }
  if (!isDesignPartnerLifecycleAuditAction(input.action)) {
    throw new Error("invalid_lifecycle_action");
  }

  const applicationId = canonicalizeLifecycleApplicationUuid(input.applicationId);
  if (!applicationId) {
    throw new Error("invalid_lifecycle_application_id");
  }

  assertIsoUtcMilliseconds(input.ts);
  assertSafeAsciiLifecycleToken(input.action, "action");
  assertSafeAsciiLifecycleToken(input.actorCategory, "actor_category");

  const adminAccessMethod = mapOperatorCategoryToAccessMethod(input.actorCategory);
  const metadata = buildDesignPartnerLifecycleAuditMetadata({
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    adminAccessMethod,
    promotedPartnerId: input.promotedPartnerId,
    action: input.action,
  });

  const metadataJson = serializeMetadataObject(metadata);

  return [
    "{",
    `"actor_type":"${LIFECYCLE_AUDIT_ACTOR_TYPE}",`,
    `"actor_id":"${input.actorCategory}",`,
    `"action":"${input.action}",`,
    `"object_type":"${LIFECYCLE_AUDIT_OBJECT_TYPE}",`,
    `"object_id":"${applicationId}",`,
    `"policy_id":null,`,
    `"policy_version":null,`,
    `"metadata":${metadataJson},`,
    `"ts":"${input.ts}"`,
    "}",
  ].join("");
}

export function computeLifecycleAuditEventHash(input: LifecycleAuditHashInput): string {
  const payload = serializeLifecycleAuditHashPayload(input);
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function formatIsoUtcMilliseconds(date: Date): string {
  return date.toISOString();
}
