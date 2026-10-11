import { describe, expect, it } from "vitest";
import { evaluateDemoSolanaSchemaGate } from "./demoSolanaSchemaGate";

const prereq = [
  "partner_policies",
  "identity_verifications",
  "decision_receipts",
  "partner_flow_continuations",
  "reusable_eligibility_facts",
];

describe("evaluateDemoSolanaSchemaGate", () => {
  it("returns ready_for_incremental_apply for Demo-like catalog without Solana tables", () => {
    const gate = evaluateDemoSolanaSchemaGate({
      tablesPresent: prereq,
      columnsPresent: [],
      policyIdsPresent: [],
      latestMigrationName: "087_stocklana_pilot",
    });
    expect(gate.verdict).toBe("ready_for_incremental_apply");
    expect(gate.safeNextActions.some(a => a.includes("Founder authorization"))).toBe(true);
  });

  it("fails closed on partial Solana schema", () => {
    const gate = evaluateDemoSolanaSchemaGate({
      tablesPresent: [...prereq, "holder_accounts"],
      columnsPresent: [],
      policyIdsPresent: [],
    });
    expect(gate.verdict).toBe("blocked_partial_solana");
  });
});
