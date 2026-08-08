import { describe, expect, it } from "vitest";
import {
  holderPrivacyPayloadHasNoForbiddenFields,
  holderPrivacyRequestHasOnlyAllowedFields,
} from "@/lib/privacy/holderResponseContract";
import { toHolderView } from "@/lib/privacy/types";
import type { PrivacyRequestRecord } from "@/lib/privacy/types";

const sample: PrivacyRequestRecord = {
  id: "00000000-0000-4000-8000-000000000099",
  subject_sui: "0x0000000000000000000000000000000000000000000000000000000000000001",
  subject_pseudonym_id: "pseudo-secret",
  request_type: "data_export",
  status: "requested",
  reason_code: "holder_requested",
  idempotency_key: "key-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("holder privacy response contract", () => {
  it("holder view exposes status and dates only", () => {
    const view = toHolderView(sample);
    expect(holderPrivacyRequestHasOnlyAllowedFields(view as unknown as Record<string, unknown>)).toBe(true);
    expect(view).not.toHaveProperty("id");
    expect(view).not.toHaveProperty("request_ref");
    expect(view).not.toHaveProperty("reason_code");
  });

  it("rejects payloads with forbidden PII fields", () => {
    expect(holderPrivacyPayloadHasNoForbiddenFields({ requests: [toHolderView(sample)] })).toBe(true);
    expect(holderPrivacyPayloadHasNoForbiddenFields({ email: "a@b.com" })).toBe(false);
    expect(holderPrivacyPayloadHasNoForbiddenFields({ requests: [{ id: "uuid" }] })).toBe(false);
  });
});
