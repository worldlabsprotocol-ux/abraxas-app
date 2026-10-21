import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_DEFENSIBLE_PANELS,
  HOMEPAGE_PROTOCOL_FLOW_STAGES,
  HOMEPAGE_WHAT_HEADING,
} from "./homepageTrustArchitectureCopy";

describe("homepage trust architecture copy", () => {
  it("defines six protocol stages in order", () => {
    expect(HOMEPAGE_WHAT_HEADING).toBe("What Abraxas does");
    expect(HOMEPAGE_PROTOCOL_FLOW_STAGES.map((s) => s.id)).toEqual([
      "application",
      "holder_authorization",
      "issuer_evidence",
      "policy_evaluation",
      "signed_decision",
      "independent_verification",
    ]);
  });

  it("clarifies issuer evidence is policy-dependent", () => {
    const issuer = HOMEPAGE_PROTOCOL_FLOW_STAGES.find((s) => s.id === "issuer_evidence");
    expect(issuer?.summary).toMatch(/When the policy requires/i);
    expect(issuer?.summary).toMatch(/wallet-control/i);
  });

  it("does not overclaim independent verification modes", () => {
    const verify = HOMEPAGE_PROTOCOL_FLOW_STAGES.find((s) => s.id === "independent_verification");
    expect(verify?.summary).toMatch(/supported receipt/i);
    const panel = HOMEPAGE_DEFENSIBLE_PANELS.find((p) => p.id === "independent_verify");
    expect(panel?.body).toMatch(/supported cryptographic evidence/i);
  });
});
