import { describe, expect, it } from "vitest";
import {
  evaluateWalletBindingSchema,
  isSchemaCacheChainError,
  WALLET_BINDING_REQUIRED_COLUMNS,
  WALLET_BINDING_SCHEMA_MIGRATION,
} from "./schemaPreflight";

describe("evaluateWalletBindingSchema", () => {
  it("reports compatible when all required columns exist", () => {
    const result = evaluateWalletBindingSchema([...WALLET_BINDING_REQUIRED_COLUMNS, "subject_id"]);
    expect(result.compatible).toBe(true);
    expect(result.status).toBe("compatible");
    expect(result.missingColumns).toEqual([]);
  });

  it("detects missing chain column (020-era schema)", () => {
    const result = evaluateWalletBindingSchema(["id", "wallet_address", "message", "expires_at"]);
    expect(result.compatible).toBe(false);
    expect(result.status).toBe("missing_chain");
    expect(result.migration).toBe(WALLET_BINDING_SCHEMA_MIGRATION);
    expect(result.userMessage).toMatch(/temporarily unavailable/i);
    expect(result.operatorMessage).toMatch(/chain/);
  });

  it("detects legacy challenge_id primary key", () => {
    const result = evaluateWalletBindingSchema(["challenge_id", "wallet_address", "message", "expires_at"]);
    expect(result.compatible).toBe(false);
    expect(result.status).toBe("missing_id");
    expect(result.operatorMessage).toMatch(/challenge_id/);
  });
});

describe("isSchemaCacheChainError", () => {
  it("matches production PostgREST schema cache message", () => {
    expect(
      isSchemaCacheChainError(
        "Could not find the 'chain' column of 'wallet_binding_challenges' in the schema cache.",
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isSchemaCacheChainError("connection timeout")).toBe(false);
  });
});
