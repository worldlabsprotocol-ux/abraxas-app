// FILE: lib/privacy/auditorDisclosure/auditPrivacy.ts
// Machine-readable forbidden-field scan for auditor_review output.

import { AUDITOR_REVIEW_FORBIDDEN_FIELDS } from "./contract";

export function auditAuditorDisclosurePayload(payload: Record<string, unknown>): {
  forbidden_field_count: number;
  forbidden_fields: string[];
} {
  const json = JSON.stringify(payload).toLowerCase();
  const forbidden_fields = AUDITOR_REVIEW_FORBIDDEN_FIELDS.filter((field) => {
    return json.includes(`"${field}"`) || json.includes(`${field}:`);
  });
  return {
    forbidden_field_count: forbidden_fields.length,
    forbidden_fields,
  };
}