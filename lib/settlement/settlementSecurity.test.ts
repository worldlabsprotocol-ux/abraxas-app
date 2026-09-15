// FILE: lib/settlement/settlementSecurity.test.ts

import { describe, expect, it } from "vitest";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { RECEIPT_COMMITMENT_DOCUMENTATION } from "@/lib/settlement/receiptCommitment";
import { AGENT_SETTLEMENT_RULES } from "@/lib/settlement/agentContract";
import { PROOF_GATED_SETTLEMENT_ABI } from "@/lib/settlement/contractAbi";

describe("settlement security invariants", () => {
  it("exposes stable public error codes", () => {
    expect(SETTLEMENT_PUBLIC_ERRORS.unauthorized).toBe("settlement_unauthorized");
    expect(SETTLEMENT_PUBLIC_ERRORS.receipt_expired).toBe("settlement_receipt_expired");
    expect(SETTLEMENT_PUBLIC_ERRORS.production_unavailable).toBe("settlement_production_unavailable");
  });

  it("documents receipt commitment limits", () => {
    expect(RECEIPT_COMMITMENT_DOCUMENTATION.doesNotProve.some((s) => s.includes("anonymous"))).toBe(true);
    expect(RECEIPT_COMMITMENT_DOCUMENTATION.proves.length).toBeGreaterThan(0);
  });

  it("keeps agent private keys outside Abraxas", () => {
    expect(AGENT_SETTLEMENT_RULES.some((r) => r.includes("never stores"))).toBe(true);
  });

  it("emits privacy preserving events without PII field names in ABI", () => {
    const json = JSON.stringify(PROOF_GATED_SETTLEMENT_ABI);
    expect(json.toLowerCase()).not.toContain("email");
    expect(json.toLowerCase()).not.toContain("birth");
    expect(json.toLowerCase()).not.toContain("passport");
    expect(json.toLowerCase()).not.toContain("oauth");
  });
});
