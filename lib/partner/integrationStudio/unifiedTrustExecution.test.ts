import { describe, expect, it } from "vitest";
import {
  appendSafeReturnPath,
  buildIntegrationStudioResumeUrl,
  classifyPortableDecision,
  independentlyAccepted,
  resolveIntegrationStudioExecutionMode,
  SOLANA_EXECUTION_PENDING_MESSAGE,
  shouldContinueAfterHolderAuthorization,
  safeSameOriginReturnPath,
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

  it("classifies verified decision semantics instead of treating authenticity as approval", () => {
    const current = { result: { cryptographically_authentic: true, currently_acceptable: "yes" as const } };
    expect(classifyPortableDecision("approved", current)).toBe("allow");
    expect(classifyPortableDecision("denied", current)).toBe("deny");
    expect(classifyPortableDecision("manual_review", current)).toBe("indeterminate");
    expect(classifyPortableDecision("approved", {
      result: { cryptographically_authentic: true, currently_acceptable: "no" },
    })).toBe("revoked_or_stale");
    expect(classifyPortableDecision("approved", {
      result: { cryptographically_authentic: false, currently_acceptable: "yes" },
    })).toBe("malformed");
  });

  it("builds a same-origin, refresh-safe return path", () => {
    const resume = buildIntegrationStudioResumeUrl(
      "https://abraxasworld.xyz/build?integration=1",
      "challenge-1",
    );
    expect(resume).toBe("/build?integration=1&trust_execution_challenge=challenge-1");
    expect(appendSafeReturnPath("/partner/trust-execution?challenge_id=challenge-1", resume, "https://abraxasworld.xyz"))
      .toContain(`return_to=${encodeURIComponent(resume)}`);
    expect(appendSafeReturnPath(
      "https://abraxasworld.xyz/partner/trust-execution?challenge_id=challenge-1&defer_execution=1",
      resume,
      "https://abraxasworld.xyz",
    )).toBe(
      `https://abraxasworld.xyz/partner/trust-execution?challenge_id=challenge-1&defer_execution=1&return_to=${encodeURIComponent(resume)}`,
    );
    expect(appendSafeReturnPath(
      "https://attacker.example/partner/trust-execution?challenge_id=challenge-1",
      resume,
      "https://abraxasworld.xyz",
    )).toBeNull();
    expect(appendSafeReturnPath(
      "//attacker.example/partner/trust-execution?challenge_id=challenge-1",
      resume,
      "https://abraxasworld.xyz",
    )).toBeNull();
    expect(appendSafeReturnPath(
      "javascript:alert(1)",
      resume,
      "https://abraxasworld.xyz",
    )).toBeNull();
    expect(appendSafeReturnPath(
      "/partner/trust-execution?challenge_id=challenge-1",
      "https://attacker.example/return",
      "https://abraxasworld.xyz",
    )).toBeNull();
    expect(appendSafeReturnPath(
      "/partner/trust-execution",
      resume,
      "https://abraxasworld.xyz",
    )).toBeNull();
    expect(safeSameOriginReturnPath(resume)).toBe(resume);
    expect(safeSameOriginReturnPath("https://attacker.example/return")).toBeNull();
    expect(safeSameOriginReturnPath("//attacker.example/return")).toBeNull();
  });
});

