import { describe, expect, it } from "vitest";
import {
  ISSUER_MANDATE_HANDOFF_REQUIREMENTS,
  mandateHandoffDocumentChecklist,
} from "./issuerMandateHandoffRequirements";

describe("issuer mandate handoff requirements (Build 895)", () => {
  it("lists minimum secure integration evidence", () => {
    expect(ISSUER_MANDATE_HANDOFF_REQUIREMENTS.length).toBeGreaterThanOrEqual(4);
    const ids = ISSUER_MANDATE_HANDOFF_REQUIREMENTS.map((r) => r.id);
    expect(ids).toContain("signed_issuer_authority");
    expect(ids).toContain("mandate_payload");
    expect(mandateHandoffDocumentChecklist()).toContain("abraxas_institutional_mandate");
  });
});
