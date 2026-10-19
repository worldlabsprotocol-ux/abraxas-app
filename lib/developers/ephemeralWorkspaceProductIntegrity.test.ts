// FILE: lib/developers/ephemeralWorkspaceProductIntegrity.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { policyExperienceBanner } from "./ephemeralWorkspaceCopy";
import { SANDBOX_AGE_PRESENTATION_DISCLOSURE } from "@/lib/protocolVerification/sandboxAgePresentationCopy";
import { EPHEMERAL_SANDBOX_TEST_POLICIES } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";

describe("developer workspace product integrity copy", () => {
  it("labels Age 21 sandbox policy as demonstration, not real eligibility", () => {
    const agePolicy = EPHEMERAL_SANDBOX_TEST_POLICIES.find((p) => p.policy_id === "age_21_retail");
    expect(agePolicy?.label.toLowerCase()).toContain("demonstration");
    expect(agePolicy?.description.toLowerCase()).toContain("real world");
  });

  it("states sandbox age experience is not real world eligibility", () => {
    const banner = policyExperienceBanner("age_21_retail", "age_21_test");
    expect(banner?.toLowerCase()).toContain("not real world");
  });

  it("disclosure notice rejects Production trusted real age claims", () => {
    expect(SANDBOX_AGE_PRESENTATION_DISCLOSURE.sandbox_notice.toLowerCase()).toContain("demonstration");
    expect(SANDBOX_AGE_PRESENTATION_DISCLOSURE.sandbox_notice.toLowerCase()).not.toContain("proves your real");
  });

  it("milestone doc forbids Veriff as foundation of wallet native path", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/blockchain-native-institutional-verification.md"),
      "utf8",
    );
    expect(doc).toContain("recognized cryptographic issuer authority");
    expect(doc.toLowerCase()).toContain("veriff");
    expect(doc).toContain("NO-GO");
  });
});
