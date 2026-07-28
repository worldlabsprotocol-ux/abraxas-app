// FILE: lib/idv/adminIdentitySchema.test.ts

import { describe, expect, it } from "vitest";
import {
  ADMIN_WORKFLOW_COLUMN_USAGE,
  IDENTITY_BIOMETRIC_ASSESSMENTS_COLUMNS,
  IDENTITY_REVIEW_AUDIT_LOG_COLUMNS,
  PASSPORT_DOCUMENTS_COLUMNS,
} from "./adminIdentitySchema";

describe("adminIdentitySchema", () => {
  it("queue passport select columns exist on passport_documents", () => {
    const table = new Set(PASSPORT_DOCUMENTS_COLUMNS);
    for (const col of ADMIN_WORKFLOW_COLUMN_USAGE.queue_passport_documents_select) {
      expect(table.has(col), `missing passport_documents.${col}`).toBe(true);
    }
  });

  it("queue biometric select columns exist on identity_biometric_assessments", () => {
    const table = new Set(IDENTITY_BIOMETRIC_ASSESSMENTS_COLUMNS);
    for (const col of ADMIN_WORKFLOW_COLUMN_USAGE.queue_biometric_select) {
      expect(table.has(col), `missing identity_biometric_assessments.${col}`).toBe(true);
    }
  });

  it("approve update columns exist on passport_documents", () => {
    const table = new Set(PASSPORT_DOCUMENTS_COLUMNS);
    for (const col of ADMIN_WORKFLOW_COLUMN_USAGE.approve_passport_documents_update) {
      expect(table.has(col), `missing passport_documents.${col}`).toBe(true);
    }
  });

  it("reviewer_note and reviewed_by come from migration 021 not 050", () => {
    expect(PASSPORT_DOCUMENTS_COLUMNS).toContain("reviewer_note");
    expect(PASSPORT_DOCUMENTS_COLUMNS).toContain("reviewed_by");
    expect(PASSPORT_DOCUMENTS_COLUMNS).toContain("reviewed_at");
  });

  it("audit log insert fields match table columns", () => {
    const table = new Set(IDENTITY_REVIEW_AUDIT_LOG_COLUMNS);
    for (const col of ADMIN_WORKFLOW_COLUMN_USAGE.audit_log_insert) {
      expect(table.has(col), `missing identity_review_audit_log.${col}`).toBe(true);
    }
  });
});
