// FILE: lib/admin/designPartnerApplicationLifecycle.test.ts

import { describe, expect, it } from "vitest";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import {
  assertSandboxKeyPrefixMatchesGenerator,
  buildNotesOnlyUpdatePayload,
  buildTransitionUpdatePayload,
  canNotesOnlyUpdate,
  classifyTransitionFailure,
  createSandboxPromotionKeyMaterial,
  isValidPartnerId,
  isValidSandboxKeyPrefix,
  normalizeReviewerNotes,
  parsePromoteRpcResult,
  SANDBOX_KEY_PREFIX_LENGTH,
  transitionFromStatuses,
  validatePromoteRpcInputs,
} from "./designPartnerApplicationLifecycle";

describe("designPartnerApplicationLifecycle", () => {
  it("validates partner ids", () => {
    expect(isValidPartnerId("acme-v1")).toBe(true);
    expect(isValidPartnerId("-bad")).toBe(false);
    expect(isValidPartnerId("")).toBe(false);
  });

  it("validates sandbox key prefix from generatePartnerKey(test)", () => {
    const { raw, prefix } = generatePartnerKey("test");
    expect(prefix.length).toBe(SANDBOX_KEY_PREFIX_LENGTH);
    expect(isValidSandboxKeyPrefix(prefix)).toBe(true);
    expect(assertSandboxKeyPrefixMatchesGenerator(prefix, raw)).toBe(true);
    expect(isValidSandboxKeyPrefix("abx_live_1234567")).toBe(false);
  });

  it("createSandboxPromotionKeyMaterial always issues abx_test_", () => {
    const material = createSandboxPromotionKeyMaterial();
    expect(material.raw.startsWith("abx_test_")).toBe(true);
    expect(material.prefix.startsWith("abx_test_")).toBe(true);
    expect(validatePromoteRpcInputs({
      applicationId: "00000000-0000-4000-8000-000000000001",
      partnerId: "acme-v1",
      keyPrefix: material.prefix,
      keyHash: material.hash,
    })).toBeNull();
  });

  it("transition payload sets reviewed_at only for real transitions", () => {
    const payload = buildTransitionUpdatePayload("rejected");
    expect(payload.status).toBe("rejected");
    expect(payload.reviewed_at).toBeTruthy();
    expect(payload).not.toHaveProperty("reviewer_notes");
  });

  it("transition payload includes reviewer_notes only when explicitly provided", () => {
    expect(buildTransitionUpdatePayload("approved", "note")).toEqual({
      status: "approved",
      reviewed_at: expect.any(String),
      reviewer_notes: "note",
    });
    expect(buildTransitionUpdatePayload("approved", "")).toMatchObject({
      reviewer_notes: null,
    });
  });

  it("notes-only payload includes reviewer_notes only when provided", () => {
    expect(buildNotesOnlyUpdatePayload(undefined)).toEqual({});
    expect(buildNotesOnlyUpdatePayload("")).toEqual({ reviewer_notes: null });
    expect(buildNotesOnlyUpdatePayload(" keep ")).toEqual({ reviewer_notes: "keep" });
    expect(normalizeReviewerNotes("")).toBeNull();
  });

  it("classifies idempotent reject and approve paths", () => {
    const row = { id: "1", status: "rejected", promoted_partner_id: null };
    expect(classifyTransitionFailure(row, "rejected", false)).toBe("no_op");
    expect(classifyTransitionFailure(row, "rejected", true)).toBe("notes_only");
  });

  it("blocks reject when promoted", () => {
    const row = { id: "1", status: "approved", promoted_partner_id: "acme-v1" };
    expect(classifyTransitionFailure(row, "rejected", false)).toBe("application_already_promoted");
  });

  it("allows onboarded notes-only when promoted_partner_id is set", () => {
    const row = { id: "1", status: "onboarded", promoted_partner_id: "acme-v1" };
    expect(canNotesOnlyUpdate(row, "onboarded")).toBe(true);
  });

  it("defines transition sources", () => {
    expect(transitionFromStatuses("approved")).toEqual(["submitted"]);
    expect(transitionFromStatuses("rejected")).toEqual(["submitted", "approved"]);
  });

  it("parses allowlisted promote rpc responses", () => {
    expect(parsePromoteRpcResult({
      ok: true,
      code: "ok",
      application_id: "a",
      partner_id: "p",
      key_prefix: "abx_test_1234567",
    })).toMatchObject({ ok: true, code: "ok", partner_id: "p" });
    expect(parsePromoteRpcResult({ ok: false, code: "application_rejected" }).code).toBe("application_rejected");
  });
});
