import { describe, it, expect } from "vitest";
import {
  isSandboxPolicyId,
  sandboxPartnerIdForPolicy,
  SANDBOX_PARTNER_ID,
  SANDBOX_POLICY_ID,
  LEGACY_SANDBOX_POLICY_ID,
} from "@/lib/partner/sandboxPartner";

describe("sandboxPartner", () => {
  it("recognizes canonical and legacy sandbox policy ids", () => {
    expect(isSandboxPolicyId(SANDBOX_POLICY_ID)).toBe(true);
    expect(isSandboxPolicyId(LEGACY_SANDBOX_POLICY_ID)).toBe(true);
    expect(isSandboxPolicyId("cielo-verified-guest-v1")).toBe(false);
  });

  it("maps sandbox policy to sandbox partner id", () => {
    expect(sandboxPartnerIdForPolicy(SANDBOX_POLICY_ID)).toBe(SANDBOX_PARTNER_ID);
    expect(sandboxPartnerIdForPolicy("abraxas-core-v1")).toBe("abraxas-pilot");
  });
});
