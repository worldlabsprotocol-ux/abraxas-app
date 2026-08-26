// FILE: components/admin/DesignPartnerPilotSummaryBar.test.tsx
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DesignPartnerPilotSummaryBar } from "@/components/admin/DesignPartnerPilotSummaryBar";
import type { DesignPartnerPilotSummaryDto } from "@/lib/admin/designPartnerPilotSummary";

const summary: DesignPartnerPilotSummaryDto = {
  application_id: "app-1",
  promoted_partner_id: "acme-v1",
  display_name: "Acme Corp",
  phase: "sandbox_testing",
  technical: {
    provisioning_ready: true,
    production_environment_active: false,
    webhook_configured: { availability: "available", value: false },
  },
  signoff_progress: {
    main_gates_acknowledged: 0,
    main_gates_total: 4,
    webhook_track_acknowledged: null,
    webhook_track_total: null,
  },
  blocker_codes: ["MANUAL_SIGNOFF_INCOMPLETE"],
  links: {
    onboarding: "/admin/partners?tab=onboarding&partner_id=acme-v1",
    signoff: "/admin/design-partners#pilot-signoff-acme-v1",
    observability: "/admin/partners?tab=observability",
    production_activation: "/admin/partner-flow/readiness",
  },
};

describe("DesignPartnerPilotSummaryBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows production environment not active without entitlement language", () => {
    render(<DesignPartnerPilotSummaryBar summary={summary} />);
    expect(screen.getByTestId("pilot-production-state").textContent).toBe(
      "Production environment not active.",
    );
    expect(screen.getByTestId("pilot-summary-bar").textContent).not.toMatch(/eligible|entitlement|ready for production/i);
  });

  it("renders onboarding link with partner_id and observability helper copy", () => {
    render(<DesignPartnerPilotSummaryBar summary={summary} />);
    expect(screen.getByTestId("pilot-link-onboarding").getAttribute("href")).toContain("partner_id=acme-v1");
    expect(screen.getByText(/enter partner ID there/i)).toBeTruthy();
  });

  it("renders safe blocker copy instead of raw codes", () => {
    render(<DesignPartnerPilotSummaryBar summary={summary} />);
    expect(screen.getByText("Sandbox pilot sign-off is incomplete.")).toBeTruthy();
    expect(screen.queryByText("MANUAL_SIGNOFF_INCOMPLETE")).toBeNull();
  });

  it("hides webhook configured chip when availability is unavailable", () => {
    render(
      <DesignPartnerPilotSummaryBar
        summary={{
          ...summary,
          technical: {
            ...summary.technical,
            webhook_configured: { availability: "unavailable" },
          },
        }}
      />,
    );
    expect(screen.queryByText(/Webhook endpoint configured/i)).toBeNull();
  });

  it("shows inconsistent sign-off copy without internal field names", () => {
    render(
      <DesignPartnerPilotSummaryBar
        summary={{
          ...summary,
          blocker_codes: ["SIGNOFF_STATE_INCONSISTENT"],
        }}
      />,
    );
    expect(screen.getByText("Sandbox sign-off state needs operator review.")).toBeTruthy();
    expect(screen.getByText(/operator review/i).textContent).not.toMatch(/manual_partner_confirmation|approved_for_pilot/i);
  });
});
