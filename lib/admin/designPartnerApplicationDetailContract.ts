// FILE: lib/admin/designPartnerApplicationDetailContract.ts
// Client-safe design-partner application admin DTO contract.

export const DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS = [
  "id",
  "promoted_partner_id",
  "reviewer_notes",
  "company",
  "contact_name",
  "email",
  "website",
  "integration_type",
  "use_case",
  "monthly_volume",
  "public_name_ok",
  "status",
  "created_at",
  "reviewed_at",
] as const;

export type DesignPartnerApplicationAdminDtoKey =
  (typeof DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS)[number];

export interface DesignPartnerApplicationAdminDto {
  id: string;
  promoted_partner_id: string | null;
  reviewer_notes: string | null;
  company: string;
  contact_name: string | null;
  email: string;
  website: string | null;
  integration_type: string;
  use_case: string | null;
  monthly_volume: string | null;
  public_name_ok: boolean;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface DesignPartnerApplicationListResponse {
  applications: DesignPartnerApplicationAdminDto[];
}

export const DESIGN_PARTNER_REVIEW_CHECKLIST_ITEMS = [
  "company_contact_reviewed",
  "email_format_reviewed",
  "website_reviewed_manually",
  "use_case_volume_reviewed",
  "integration_public_naming_reviewed",
] as const;

export type DesignPartnerReviewChecklistItemId =
  (typeof DESIGN_PARTNER_REVIEW_CHECKLIST_ITEMS)[number];

export const DESIGN_PARTNER_REVIEW_CHECKLIST_LABELS: Record<
  DesignPartnerReviewChecklistItemId,
  string
> = {
  company_contact_reviewed: "Company and contact reviewed",
  email_format_reviewed: "Work email reviewed (format only — not verified)",
  website_reviewed_manually: "Website reviewed manually (not opened automatically)",
  use_case_volume_reviewed: "Use case and expected volume reviewed",
  integration_public_naming_reviewed: "Integration type and public-naming preference noted",
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isDesignPartnerApplicationAdminDto(
  value: unknown,
): value is DesignPartnerApplicationAdminDto {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS.length) return false;
  for (const key of DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS) {
    if (!(key in record)) return false;
  }
  if (typeof record.id !== "string") return false;
  if (!isNullableString(record.promoted_partner_id)) return false;
  if (!isNullableString(record.reviewer_notes)) return false;
  if (typeof record.company !== "string") return false;
  if (!isNullableString(record.contact_name)) return false;
  if (typeof record.email !== "string") return false;
  if (!isNullableString(record.website)) return false;
  if (typeof record.integration_type !== "string") return false;
  if (!isNullableString(record.use_case)) return false;
  if (!isNullableString(record.monthly_volume)) return false;
  if (typeof record.public_name_ok !== "boolean") return false;
  if (typeof record.status !== "string") return false;
  if (typeof record.created_at !== "string") return false;
  if (!isNullableString(record.reviewed_at)) return false;
  return true;
}

export function parseDesignPartnerApplicationListResponse(
  payload: unknown,
): DesignPartnerApplicationListResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("invalid_response");
  }
  const applications = (payload as Record<string, unknown>).applications;
  if (!Array.isArray(applications)) {
    throw new Error("invalid_response");
  }
  for (const entry of applications) {
    if (!isDesignPartnerApplicationAdminDto(entry)) {
      throw new Error("invalid_response");
    }
  }
  return { applications: applications as DesignPartnerApplicationAdminDto[] };
}
