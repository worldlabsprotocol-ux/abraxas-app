// FILE: lib/partner/partnerProofAgent.test.ts

import { describe, expect, it } from "vitest";
import { PARTNER_PROOF_AGENT_SCHEMA } from "@/lib/partner/partnerProofAgent";

describe("partner proof agent boundaries", () => {
  it("declares agent schema version", () => {
    expect(PARTNER_PROOF_AGENT_SCHEMA).toBe("abraxas.partner.proof_agent.v1");
  });

  it("documents forbidden agent capabilities in source", async () => {
    const { inspectPartnerPolicyForAgent } = await import("@/lib/partner/partnerProofAgent");
    expect(typeof inspectPartnerPolicyForAgent).toBe("function");
    const source = await import("fs").then((fs) =>
      fs.readFileSync("lib/partner/partnerProofAgent.ts", "utf8"),
    );
    expect(source).toContain("receive_raw_identity_documents");
    expect(source).toContain("override_policy");
    expect(source).toContain("token_holdings_affect_eligibility: false");
  });
});
