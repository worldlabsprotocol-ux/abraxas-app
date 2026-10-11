import { describe, expect, it } from "vitest";
import {
  evaluateSolanaIncrementalReadiness,
  SOLANA_INCREMENTAL_MIGRATION_FILES,
} from "./solanaIncrementalMigrations";

describe("evaluateSolanaIncrementalReadiness", () => {
  const prereqTables = [
    "partner_policies",
    "identity_verifications",
    "decision_receipts",
    "partner_flow_continuations",
    "reusable_eligibility_facts",
  ];

  it("marks ready when prerequisites exist and all Solana objects missing", () => {
    const result = evaluateSolanaIncrementalReadiness({
      tablesPresent: prereqTables,
      columnsPresent: [],
      policyIdsPresent: [],
    });
    expect(result.readyForIncrementalApply).toBe(true);
    expect(result.partialSolanaActivation).toBe(false);
    expect(result.incrementalPlan).toEqual(SOLANA_INCREMENTAL_MIGRATION_FILES);
  });

  it("blocks when prerequisites missing", () => {
    const result = evaluateSolanaIncrementalReadiness({
      tablesPresent: ["partner_policies"],
      columnsPresent: [],
      policyIdsPresent: [],
    });
    expect(result.readyForIncrementalApply).toBe(false);
    expect(result.missingPrerequisites.length).toBeGreaterThan(0);
  });

  it("detects partial Solana activation", () => {
    const result = evaluateSolanaIncrementalReadiness({
      tablesPresent: [...prereqTables, "holder_wallet_accounts"],
      columnsPresent: [],
      policyIdsPresent: [],
    });
    expect(result.partialSolanaActivation).toBe(true);
    expect(result.readyForIncrementalApply).toBe(false);
  });

  it("detects complete Solana schema", () => {
    const result = evaluateSolanaIncrementalReadiness({
      tablesPresent: [
        ...prereqTables,
        "holder_wallet_accounts",
        "holder_wallet_login_challenges",
        "holder_accounts",
        "decision_receipt_solana_commitments",
      ],
      columnsPresent: ["identity_verifications.holder_account_id"],
      policyIdsPresent: ["cielo-verified-guest-solana-v1", "good-trouble-age_21_retail-solana-v1"],
    });
    expect(result.solanaSchemaComplete).toBe(true);
    expect(result.readyForIncrementalApply).toBe(false);
  });
});
