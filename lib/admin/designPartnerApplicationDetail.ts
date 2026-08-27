// FILE: lib/admin/designPartnerApplicationDetail.ts
// Server-side projection from design_partners rows to admin DTOs.

import type { DesignPartnerApplicationAdminDto } from "@/lib/admin/designPartnerApplicationDetailContract";

export const DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS = [
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
].join(", ");

type DesignPartnerApplicationDbRow = {
  id: unknown;
  promoted_partner_id: unknown;
  reviewer_notes: unknown;
  company: unknown;
  contact_name: unknown;
  email: unknown;
  website: unknown;
  integration_type: unknown;
  use_case: unknown;
  monthly_volume: unknown;
  public_name_ok: unknown;
  status: unknown;
  created_at: unknown;
  reviewed_at: unknown;
};

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function asIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

export function mapDesignPartnerApplicationRow(
  row: unknown,
): DesignPartnerApplicationAdminDto | null {
  if (!row || typeof row !== "object") return null;
  const record = row as DesignPartnerApplicationDbRow;
  if (typeof record.id !== "string") return null;
  if (typeof record.company !== "string") return null;
  if (typeof record.email !== "string") return null;
  if (typeof record.status !== "string") return null;
  const createdAt = asIsoString(record.created_at);
  if (!createdAt) return null;

  return {
    id: record.id,
    promoted_partner_id: asNullableString(record.promoted_partner_id),
    reviewer_notes: asNullableString(record.reviewer_notes),
    company: record.company,
    contact_name: asNullableString(record.contact_name),
    email: record.email,
    website: asNullableString(record.website),
    integration_type:
      typeof record.integration_type === "string" && record.integration_type.trim()
        ? record.integration_type
        : "passport_gate",
    use_case: asNullableString(record.use_case),
    monthly_volume: asNullableString(record.monthly_volume),
    public_name_ok: record.public_name_ok === true,
    status: record.status,
    created_at: createdAt,
    reviewed_at: asIsoString(record.reviewed_at),
  };
}

export function mapDesignPartnerApplicationRows(
  rows: unknown[],
): DesignPartnerApplicationAdminDto[] {
  const mapped: DesignPartnerApplicationAdminDto[] = [];
  for (const row of rows) {
    const dto = mapDesignPartnerApplicationRow(row);
    if (dto) mapped.push(dto);
  }
  return mapped;
}
