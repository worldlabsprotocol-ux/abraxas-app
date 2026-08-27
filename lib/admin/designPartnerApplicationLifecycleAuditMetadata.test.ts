// FILE: lib/admin/designPartnerApplicationLifecycleAuditMetadata.test.ts

import { describe, expect, it } from "vitest";
import {
  buildDesignPartnerLifecycleAuditMetadata,
  canonicalizeLifecycleApplicationUuid,
  lifecycleAuditMetadataHasOnlyAllowlistedKeys,
  validatePromotedPartnerId,
} from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";

describe("designPartnerApplicationLifecycleAuditMetadata", () => {
  it("builds allowlisted approve metadata without promoted_partner_id", () => {
    const metadata = buildDesignPartnerLifecycleAuditMetadata({
      fromStatus: "submitted",
      toStatus: "approved",
      adminAccessMethod: "email",
      action: "admin.design_partner.approved",
    });
    expect(metadata).toEqual({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
    });
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys(metadata)).toBe(true);
  });

  it("requires promoted_partner_id only for promote action", () => {
    expect(() => buildDesignPartnerLifecycleAuditMetadata({
      fromStatus: "approved",
      toStatus: "onboarded",
      adminAccessMethod: "unknown",
      action: "admin.design_partner.promoted",
    })).toThrow();

    const metadata = buildDesignPartnerLifecycleAuditMetadata({
      fromStatus: "approved",
      toStatus: "onboarded",
      adminAccessMethod: "unknown",
      promotedPartnerId: "acme-v1",
      action: "admin.design_partner.promoted",
    });
    expect(metadata.promoted_partner_id).toBe("acme-v1");
  });

  it("rejects unsafe partner ids and non-lowercase UUIDs", () => {
    expect(validatePromotedPartnerId('bad"quote')).toBeNull();
    expect(validatePromotedPartnerId("ACME")).toBeNull();
    expect(canonicalizeLifecycleApplicationUuid("00000000-0000-4000-8000-000000000001")).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(canonicalizeLifecycleApplicationUuid("00000000-0000-4000-8000-00000000000G")).toBeNull();
  });

  it("rejects forbidden metadata keys including email and reviewer notes", () => {
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
      email: "ops@example.com",
    })).toBe(false);
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
      reviewer_notes: "internal",
    })).toBe(false);
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
      key_hash: "a".repeat(64),
    })).toBe(false);
  });
});
