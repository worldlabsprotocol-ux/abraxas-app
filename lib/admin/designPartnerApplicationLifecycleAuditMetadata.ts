// FILE: lib/admin/designPartnerApplicationLifecycleAuditMetadata.ts
// Strict allowlisted metadata for design-partner lifecycle audit events (no PII).

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_ACTIONS = [
  "admin.design_partner.approved",
  "admin.design_partner.rejected",
  "admin.design_partner.promoted",
] as const;

export type DesignPartnerLifecycleAuditAction =
  (typeof DESIGN_PARTNER_LIFECYCLE_AUDIT_ACTIONS)[number];

export const DESIGN_PARTNER_LIFECYCLE_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "onboarded",
] as const;

export type DesignPartnerLifecycleStatus =
  (typeof DESIGN_PARTNER_LIFECYCLE_STATUSES)[number];

export const DESIGN_PARTNER_OPERATOR_CATEGORIES = [
  "admin_authorized_email",
  "admin_pin",
  "admin_unknown",
] as const;

export type DesignPartnerOperatorCategory =
  (typeof DESIGN_PARTNER_OPERATOR_CATEGORIES)[number];

export const DESIGN_PARTNER_ADMIN_ACCESS_METHODS = [
  "email",
  "pin_header",
  "pin_cookie",
  "unknown",
] as const;

export type DesignPartnerAdminAccessMethod =
  (typeof DESIGN_PARTNER_ADMIN_ACCESS_METHODS)[number];

export const DESIGN_PARTNER_LIFECYCLE_METADATA_KEYS = [
  "from_status",
  "to_status",
  "admin_access_method",
  "promoted_partner_id",
] as const;

export const DESIGN_PARTNER_LIFECYCLE_FORBIDDEN_METADATA_KEYS = [
  "company",
  "contact_name",
  "email",
  "website",
  "use_case",
  "reviewer_notes",
  "key_prefix",
  "key_hash",
  "api_key",
  "session",
  "ip",
  "pin",
  "token",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const PARTNER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;

const SAFE_ASCII_TOKEN = /^[a-z0-9._-]+$/;

export interface DesignPartnerLifecycleAuditMetadata {
  from_status: DesignPartnerLifecycleStatus;
  to_status: DesignPartnerLifecycleStatus;
  admin_access_method: DesignPartnerAdminAccessMethod;
  promoted_partner_id?: string;
}

export function isDesignPartnerLifecycleAuditAction(
  value: string,
): value is DesignPartnerLifecycleAuditAction {
  return (DESIGN_PARTNER_LIFECYCLE_AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function isDesignPartnerOperatorCategory(
  value: string,
): value is DesignPartnerOperatorCategory {
  return (DESIGN_PARTNER_OPERATOR_CATEGORIES as readonly string[]).includes(value);
}

export function isDesignPartnerLifecycleStatus(
  value: string,
): value is DesignPartnerLifecycleStatus {
  return (DESIGN_PARTNER_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function isDesignPartnerAdminAccessMethod(
  value: string,
): value is DesignPartnerAdminAccessMethod {
  return (DESIGN_PARTNER_ADMIN_ACCESS_METHODS as readonly string[]).includes(value);
}

export function canonicalizeLifecycleApplicationUuid(value: string): string | null {
  if (!UUID_PATTERN.test(value)) return null;
  return value.toLowerCase();
}

export function assertSafeAsciiLifecycleToken(
  value: string,
  label: string,
): void {
  if (!SAFE_ASCII_TOKEN.test(value)) {
    throw new Error(`invalid_lifecycle_${label}`);
  }
}

export function mapOperatorCategoryToAccessMethod(
  category: DesignPartnerOperatorCategory,
): DesignPartnerAdminAccessMethod {
  if (category === "admin_authorized_email") return "email";
  if (category === "admin_pin") return "pin_header";
  return "unknown";
}

export function validatePromotedPartnerId(value: string): string | null {
  if (!PARTNER_ID_PATTERN.test(value)) return null;
  return value;
}

export function buildDesignPartnerLifecycleAuditMetadata(input: {
  fromStatus: DesignPartnerLifecycleStatus;
  toStatus: DesignPartnerLifecycleStatus;
  adminAccessMethod: DesignPartnerAdminAccessMethod;
  promotedPartnerId?: string | null;
  action: DesignPartnerLifecycleAuditAction;
}): DesignPartnerLifecycleAuditMetadata {
  if (!isDesignPartnerLifecycleStatus(input.fromStatus)) {
    throw new Error("invalid_lifecycle_from_status");
  }
  if (!isDesignPartnerLifecycleStatus(input.toStatus)) {
    throw new Error("invalid_lifecycle_to_status");
  }
  if (!isDesignPartnerAdminAccessMethod(input.adminAccessMethod)) {
    throw new Error("invalid_lifecycle_admin_access_method");
  }
  if (!isDesignPartnerLifecycleAuditAction(input.action)) {
    throw new Error("invalid_lifecycle_action");
  }

  const metadata: DesignPartnerLifecycleAuditMetadata = {
    from_status: input.fromStatus,
    to_status: input.toStatus,
    admin_access_method: input.adminAccessMethod,
  };

  if (input.action === "admin.design_partner.promoted") {
    const partnerId = input.promotedPartnerId
      ? validatePromotedPartnerId(input.promotedPartnerId)
      : null;
    if (!partnerId) {
      throw new Error("invalid_lifecycle_promoted_partner_id");
    }
    metadata.promoted_partner_id = partnerId;
  } else if (input.promotedPartnerId) {
    throw new Error("invalid_lifecycle_promoted_partner_id_forbidden");
  }

  return metadata;
}

export function lifecycleAuditMetadataHasOnlyAllowlistedKeys(
  metadata: DesignPartnerLifecycleAuditMetadata | Record<string, unknown>,
): boolean {
  const keys = Object.keys(metadata);
  for (const key of keys) {
    if (!(DESIGN_PARTNER_LIFECYCLE_METADATA_KEYS as readonly string[]).includes(key)) {
      return false;
    }
  }
  for (const forbidden of DESIGN_PARTNER_LIFECYCLE_FORBIDDEN_METADATA_KEYS) {
    if (forbidden in metadata) return false;
  }
  const serialized = JSON.stringify(metadata).toLowerCase();
  if (serialized.includes("@")) return false;
  return true;
}
