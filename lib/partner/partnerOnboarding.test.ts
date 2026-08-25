// FILE: lib/partner/partnerOnboarding.test.ts

import { describe, expect, it } from "vitest";
import {
  computeOnboardingProgress,
  computePartnerFlowPortalOnboarding,
  slugifyPartnerId,
} from "@/lib/partner/partnerOnboarding";
import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";

describe("partnerOnboarding", () => {
  it("slugifies company names", () => {
    expect(slugifyPartnerId("Meridian Private Credit")).toBe("meridian-private-credit");
  });

  it("tracks sandbox progress", () => {
    const progress = computeOnboardingProgress({
      hasKey: true,
      keyPrefix: "abx_test_abc",
      calls30d: 3,
      approvedDecisions: 1,
    });
    expect(progress.completed).toBe(3);
    expect(progress.productionGateEligible).toBe(false);
  });

  it("marks production gate eligible on live approved verify", () => {
    const progress = computeOnboardingProgress({
      hasKey: true,
      keyPrefix: "abx_live_xyz",
      calls30d: 5,
      approvedDecisions: 2,
    });
    expect(progress.productionGateEligible).toBe(true);
    expect(progress.steps.find(s => s.id === "production_approved")?.done).toBe(true);
  });

  it("maps Partner Flow portal onboarding from readiness booleans only", () => {
    const readiness: PartnerDashboardReadiness = {
      partner_row_ready: true,
      assigned_policy_configured: true,
      active_sandbox_policy_ready: true,
      active_policy_id: "sandbox-policy-v1",
      active_policy_ambiguous: false,
      callback_allowlist_configured: true,
      partner_flow_config_ready: true,
      verify_scopes_available: true,
      key_environment: "sandbox",
      webhook_track: {
        applicable: false,
        scope_ready: false,
        endpoint_configured: false,
        delivery_enabled: false,
        sandbox_test_available: false,
      },
      sandbox_notice: "Sandbox configuration cannot authorize Production access.",
    };

    const progress = computePartnerFlowPortalOnboarding(readiness);
    expect(progress.steps.find((s) => s.id === "partner_flow_config_ready")?.done).toBe(true);
    expect(progress.steps.find((s) => s.id === "callback_handler")?.done).toBe(false);
    expect(progress.steps.find((s) => s.id === "sandbox_receipt_validated")?.done).toBe(false);
  });
});
