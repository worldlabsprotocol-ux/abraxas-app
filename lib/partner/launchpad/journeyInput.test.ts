// FILE: lib/partner/launchpad/journeyInput.test.ts

import { describe, expect, it } from "vitest";
import {
  buildLaunchpadJourneyInput,
  integrationEndToEndEvidenced,
  starterKitEvidencedFromActivity,
  verifiedReceiptCountFromSummary,
} from "@/lib/partner/launchpad/journeyInput";
import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";

describe("journeyInput", () => {
  it("sums verified receipts from policy summary bindings", () => {
    const summary = {
      configured_count: 2,
      bindings: [
        { verified_receipts: 1 },
        { verified_receipts: 2 },
      ],
    } as ApplicationPoliciesSummary;
    expect(verifiedReceiptCountFromSummary(summary)).toBe(3);
  });

  it("detects starter kit activity without treating it as end-to-end evidence", () => {
    expect(starterKitEvidencedFromActivity({ starter_kit_generated: true })).toBe(true);
    expect(integrationEndToEndEvidenced({
      verified_receipt_count: 0,
      receipt_verification_succeeded_count: 0,
      hosted_handoff_completed_count: 1,
    })).toBe(false);
    expect(integrationEndToEndEvidenced({
      verified_receipt_count: 1,
      receipt_verification_succeeded_count: 1,
      hosted_handoff_completed_count: 0,
    })).toBe(true);
  });

  it("builds canonical journey input from summary and activity", () => {
    const input = buildLaunchpadJourneyInput({
      application: {
        id: "app-1",
        status: "active",
        environment: "sandbox",
        policy_template_id: "age_21_retail",
        policy_id: "p1",
        integration_status: "ready",
        allowed_return_urls: [],
        key_prefix: "abx_test_",
      },
      summary: {
        configured_count: 1,
        bindings: [{ verified_receipts: 0 }],
      } as ApplicationPoliciesSummary,
      activity: { starter_kit_generated: true },
      activeSandboxKey: true,
    });
    expect(input.starterKitEvidenced).toBe(true);
    expect(input.verifiedReceiptCount).toBe(0);
    expect(input.configuredPolicyCount).toBe(1);
  });
});
