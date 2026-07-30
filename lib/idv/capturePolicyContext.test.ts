// FILE: lib/idv/capturePolicyContext.test.ts

import { describe, expect, it } from "vitest";
import { capturePolicyFormFields } from "./capturePolicyContext";

describe("capturePolicyFormFields", () => {
  it("omits empty policy context fields", () => {
    expect(capturePolicyFormFields({})).toEqual({});
    expect(capturePolicyFormFields({
      verificationRequestId: "  ",
      policyId: null,
      partnerId: undefined,
    })).toEqual({});
  });

  it("maps verification request, policy, and partner ids", () => {
    expect(capturePolicyFormFields({
      verificationRequestId: "vr-123",
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
    })).toEqual({
      verification_request_id: "vr-123",
      policy_id: "good-trouble-retail-v1",
      partner_id: "good-trouble-cannabis",
    });
  });
});
