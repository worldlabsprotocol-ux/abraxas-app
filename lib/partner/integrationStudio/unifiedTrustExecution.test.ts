import { describe, expect, it } from "vitest";
import {
  independentlyAccepted,
  resolveIntegrationStudioExecutionMode,
  SOLANA_EXECUTION_PENDING_MESSAGE,
  shouldContinueAfterHolderAuthorization,
} from "./unifiedTrustExecution";

describe("Integration Studio unified trust execution", () => {
  it("keeps portable offchain verification distinct from finalized Solana execution", () => {
    expect(resolveIntegrationStudioExecutionMode("verify_with_abraxas")).toBe("offchain_portable");
    expect(resolveIntegrationStudioExecutionMode("institutional_eligibility_gate")).toBe("solana_finalized");
    expect(resolveIntegrationStudioExecutionMode("solana_onchain_eligibility_gate")).toBe("solana_finalized");
    expect(SOLANA_EXECUTION_PENDING_MESSAGE).toMatch(/finalized Solana authorization/i);
    expect(SOLANA_EXECUTION_PENDING_MESSAGE).toMatch(/will not report an offchain decision as onchain/i);
  });

  it("accepts completion only when cryptographic authenticity and current acceptability both pass", () => {
    expect(independentlyAccepted({
      result: { cryptographically_authentic: true, currently_acceptable: "yes" },
    })).toBe(true);
    expect(independentlyAccepted({
      result: { cryptographically_authentic: true, currently_acceptable: "no" },
    })).toBe(false);
    expect(independentlyAccepted({
      result: { cryptographically_authentic: false, currently_acceptable: "yes" },
    })).toBe(false);
    expect(independentlyAccepted(null)).toBe(false);
  });

  it("lets Integration Studio separate wallet authorization from execution", () => {
    expect(shouldContinueAfterHolderAuthorization("1")).toBe(false);
    expect(shouldContinueAfterHolderAuthorization(null)).toBe(true);
  });
});
