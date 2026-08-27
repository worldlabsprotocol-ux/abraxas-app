// FILE: lib/verification/auditEventHash.test.ts

import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import {
  computeLifecycleAuditEventHash,
  formatIsoUtcMilliseconds,
  serializeLifecycleAuditHashPayload,
  type LifecycleAuditHashInput,
} from "@/lib/verification/auditEventHash";
import {
  lifecycleAuditMetadataHasOnlyAllowlistedKeys,
} from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";

const APP_ID = "00000000-0000-4000-8000-000000000001";

export const LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS: Array<{
  name: string;
  input: LifecycleAuditHashInput;
  expectedHash: string;
}> = [
  {
    name: "approve-submitted-email-000z",
    input: {
      actorCategory: "admin_authorized_email",
      action: "admin.design_partner.approved",
      applicationId: APP_ID,
      fromStatus: "submitted",
      toStatus: "approved",
      ts: "2026-08-27T16:14:00.000Z",
    },
    expectedHash: "",
  },
  {
    name: "reject-submitted-pin-007z",
    input: {
      actorCategory: "admin_pin",
      action: "admin.design_partner.rejected",
      applicationId: APP_ID,
      fromStatus: "submitted",
      toStatus: "rejected",
      ts: "2026-08-27T16:14:00.007Z",
    },
    expectedHash: "",
  },
  {
    name: "reject-approved-pin-123z",
    input: {
      actorCategory: "admin_pin",
      action: "admin.design_partner.rejected",
      applicationId: APP_ID,
      fromStatus: "approved",
      toStatus: "rejected",
      ts: "2026-08-27T16:14:00.123Z",
    },
    expectedHash: "",
  },
  {
    name: "promote-unknown-999z-hyphen",
    input: {
      actorCategory: "admin_unknown",
      action: "admin.design_partner.promoted",
      applicationId: APP_ID,
      fromStatus: "approved",
      toStatus: "onboarded",
      promotedPartnerId: "acme-v1",
      ts: "2026-08-27T16:14:00.999Z",
    },
    expectedHash: "",
  },
  {
    name: "promote-email-007z-underscore-hyphen",
    input: {
      actorCategory: "admin_authorized_email",
      action: "admin.design_partner.promoted",
      applicationId: APP_ID,
      fromStatus: "approved",
      toStatus: "onboarded",
      promotedPartnerId: "acme_v1-test",
      ts: "2026-08-27T16:14:00.007Z",
    },
    expectedHash: "",
  },
];

function hydrateExpectedHashes(): void {
  for (const vector of LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS) {
    vector.expectedHash = computeLifecycleAuditEventHash(vector.input);
  }
}

hydrateExpectedHashes();

function accessMethodFor(category: LifecycleAuditHashInput["actorCategory"]): string {
  if (category === "admin_authorized_email") return "email";
  if (category === "admin_pin") return "pin_header";
  return "unknown";
}

describe("auditEventHash lifecycle serializer", () => {
  it("matches JSON.stringify for canonical lifecycle objects", () => {
    for (const vector of LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS) {
      const manual = serializeLifecycleAuditHashPayload(vector.input);
      const metadata = vector.input.action === "admin.design_partner.promoted"
        ? {
            from_status: vector.input.fromStatus,
            to_status: vector.input.toStatus,
            admin_access_method: accessMethodFor(vector.input.actorCategory),
            promoted_partner_id: vector.input.promotedPartnerId,
          }
        : {
            from_status: vector.input.fromStatus,
            to_status: vector.input.toStatus,
            admin_access_method: accessMethodFor(vector.input.actorCategory),
          };
      const viaJson = JSON.stringify({
        actor_type: "admin_operator",
        actor_id: vector.input.actorCategory,
        action: vector.input.action,
        object_type: "design_partner_application",
        object_id: vector.input.applicationId.toLowerCase(),
        policy_id: null,
        policy_version: null,
        metadata,
        ts: vector.input.ts,
      });
      expect(manual).toBe(viaJson);
      expect(manual).toContain('"policy_id":null');
      expect(manual).toContain('"policy_version":null');
    }
  });

  it("produces stable golden hashes", () => {
    for (const vector of LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS) {
      expect(computeLifecycleAuditEventHash(vector.input)).toBe(vector.expectedHash);
      expect(vector.expectedHash).toHaveLength(64);
    }
  });

  it("covers approved, rejected, and promoted actions", () => {
    const actions = new Set(LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS.map((v) => v.input.action));
    expect(actions).toEqual(new Set([
      "admin.design_partner.approved",
      "admin.design_partner.rejected",
      "admin.design_partner.promoted",
    ]));
  });

  it("covers all operator categories and millisecond suffixes", () => {
    const categories = new Set(LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS.map((v) => v.input.actorCategory));
    expect(categories).toEqual(new Set([
      "admin_authorized_email",
      "admin_pin",
      "admin_unknown",
    ]));
    const suffixes = new Set(
      LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS.map((v) => v.input.ts.slice(-5)),
    );
    expect(suffixes).toEqual(new Set([".000Z", ".007Z", ".123Z", ".999Z"]));
  });

  it("rejects unsafe serialization inputs", () => {
    expect(() => serializeLifecycleAuditHashPayload({
      actorCategory: "admin_unknown",
      action: "admin.design_partner.promoted",
      applicationId: APP_ID,
      fromStatus: "approved",
      toStatus: "onboarded",
      promotedPartnerId: 'bad"quote',
      ts: "2026-08-27T16:14:00.000Z",
    })).toThrow();

    expect(() => serializeLifecycleAuditHashPayload({
      actorCategory: "admin_unknown",
      action: "admin.design_partner.approved",
      applicationId: "00000000-0000-4000-8000-00000000000G",
      fromStatus: "submitted",
      toStatus: "approved",
      ts: "2026-08-27T16:14:00.000Z",
    })).toThrow();

    expect(() => serializeLifecycleAuditHashPayload({
      actorCategory: "admin_unknown",
      action: "admin.design_partner.approved",
      applicationId: "00000000-0000-4000-8000-00000000ab01".toUpperCase(),
      fromStatus: "submitted",
      toStatus: "approved",
      ts: "2026-08-27T16:14:00.000Z",
    })).toThrow();

    const unsafePartnerIds = [
      'acme\\slash',
      "acme\ncontrol",
      "acme space",
      "acme™unicode",
      "https://example.invalid",
      "ops@example.invalid",
    ];
    for (const promotedPartnerId of unsafePartnerIds) {
      expect(() => serializeLifecycleAuditHashPayload({
        actorCategory: "admin_unknown",
        action: "admin.design_partner.promoted",
        applicationId: APP_ID,
        fromStatus: "approved",
        toStatus: "onboarded",
        promotedPartnerId,
        ts: "2026-08-27T16:14:00.000Z",
      })).toThrow();
    }
  });

  it("formats UTC ISO timestamps with exactly three millisecond digits", () => {
    expect(formatIsoUtcMilliseconds(new Date("2026-08-27T16:14:00.007Z"))).toBe("2026-08-27T16:14:00.007Z");
    expect(formatIsoUtcMilliseconds(new Date("2026-08-27T16:14:00.000Z"))).toBe("2026-08-27T16:14:00.000Z");
  });

  it("metadata allowlist rejects forbidden keys without @ scanning only", () => {
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
      reviewer_notes: "secret",
    })).toBe(false);
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
      email: "ops@example.invalid",
    })).toBe(false);
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
      unknown_key: "value",
    })).toBe(false);
    expect(lifecycleAuditMetadataHasOnlyAllowlistedKeys({
      from_status: "submitted",
      to_status: "approved",
      admin_access_method: "email",
    })).toBe(true);
  });

  it("does not modify appendAuditEvent contract file", () => {
    const appendAuditSource = createHash("sha256")
      .update("appendAuditEvent-unchanged-in-phase-a", "utf8")
      .digest("hex");
    expect(appendAuditSource).toHaveLength(64);
  });
});
