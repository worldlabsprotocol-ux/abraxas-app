// FILE: lib/privacy/auditorDisclosure/requestPurpose.test.ts

import { describe, expect, it } from "vitest";
import { authorizeRequestedDisclosurePurpose, parseRequestedDisclosurePurpose } from "./requestPurpose";

describe("independent disclosure purpose (Build 968)", () => {
  it("requires explicit disclosure_purpose on the request", () => {
    expect(parseRequestedDisclosurePurpose(undefined)).toEqual({
      ok: false,
      reason: "disclosure_purpose_required",
    });
    expect(parseRequestedDisclosurePurpose("not_a_purpose")).toEqual({
      ok: false,
      reason: "disclosure_purpose_invalid",
    });
    expect(parseRequestedDisclosurePurpose("regulatory_examination")).toBe("regulatory_examination");
  });

  it("authorizes only when credential allowlist and mandate purpose both accept requested purpose", () => {
    expect(
      authorizeRequestedDisclosurePurpose({
        requestedPurpose: "regulatory_examination",
        mandatePurpose: "regulatory_examination",
        principalAllowedPurposes: ["regulatory_examination"],
      }),
    ).toEqual({ ok: true });

    expect(
      authorizeRequestedDisclosurePurpose({
        requestedPurpose: "soc2_type2",
        mandatePurpose: "regulatory_examination",
        principalAllowedPurposes: ["soc2_type2", "regulatory_examination"],
      }).ok,
    ).toBe(false);

    expect(
      authorizeRequestedDisclosurePurpose({
        requestedPurpose: "soc2_type2",
        mandatePurpose: "regulatory_examination",
        principalAllowedPurposes: ["regulatory_examination"],
      }),
    ).toEqual({ ok: false, reason: "disclosure_purpose_not_authorized_for_credential" });
  });
});