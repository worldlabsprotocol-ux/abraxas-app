// FILE: lib/auth/ephemeralWallet/sandboxPolicyAvailability.shared.test.ts

import { describe, expect, it } from "vitest";
import {
  firstSandboxPolicyIdWithVerification,
  pickSandboxPolicyAvailability,
  type SandboxPolicyAvailability,
} from "./sandboxPolicyAvailability.shared";

const sample: SandboxPolicyAvailability[] = [
  {
    policy_id: "wallet_control",
    execution_status: "ready",
    availability_label: "Ready",
    availability_detail: "Ready",
    can_request_verification: true,
  },
  {
    policy_id: "age_21_retail",
    execution_status: "evidence_unavailable",
    availability_label: "Unavailable",
    availability_detail: "No issuer",
    can_request_verification: false,
    age_experience: "age_21_unavailable",
  },
];

describe("sandboxPolicyAvailability.shared", () => {
  it("picks availability by policy id", () => {
    expect(pickSandboxPolicyAvailability(sample, "age_21_retail")?.can_request_verification).toBe(false);
  });

  it("prefers first policy that can request verification", () => {
    expect(
      firstSandboxPolicyIdWithVerification(
        [{ policy_id: "age_21_retail" }, { policy_id: "wallet_control" }],
        sample,
      ),
    ).toBe("wallet_control");
  });
});
