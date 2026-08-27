// FILE: components/admin/DesignPartnerIntakeHealthCard.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER,
  MIGRATION_071_OPERATOR_ATTESTATION,
  resolveOverallStatus,
  type DesignPartnerIntakeHealthReport,
} from "@/lib/admin/designPartnerIntakeHealthContract";
import { DesignPartnerIntakeHealthCard } from "@/components/admin/DesignPartnerIntakeHealthCard";

function buildReport(
  overrides: Partial<Record<(typeof DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER)[number], "pass" | "fail">>,
): DesignPartnerIntakeHealthReport {
  const checks = DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER.map((key) => ({
    key,
    status: overrides[key] ?? "pass",
  }));
  const report: DesignPartnerIntakeHealthReport = {
    generated_at: "2026-08-27T00:00:00.000Z",
    overall_status: "ready",
    runtime_environment: "production",
    checks,
    operator_attestation: {
      migration_071: MIGRATION_071_OPERATOR_ATTESTATION,
    },
  };
  report.overall_status = resolveOverallStatus(report);
  return report;
}

describe("DesignPartnerIntakeHealthCard", () => {
  const adminRequest = vi.fn();

  beforeEach(() => {
    adminRequest.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("fetches intake health exactly once across rerenders without auth changes", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildReport({}),
    });

    const stableAdminRequest = adminRequest;
    const { rerender } = render(
      <DesignPartnerIntakeHealthCard authorized loading={false} adminRequest={stableAdminRequest} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("design-partner-intake-health-status").textContent).toBe("Ready");
    });

    rerender(
      <DesignPartnerIntakeHealthCard authorized loading={false} adminRequest={stableAdminRequest} />,
    );
    rerender(
      <DesignPartnerIntakeHealthCard authorized loading={false} adminRequest={stableAdminRequest} />,
    );

    expect(adminRequest).toHaveBeenCalledTimes(1);
    expect(adminRequest).toHaveBeenCalledWith(
      "/api/admin/design-partners/intake-health",
      { cache: "no-store" },
    );
  });

  it("fetches again when authorization transitions from false to true", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildReport({}),
    });

    const stableAdminRequest = adminRequest;
    const { rerender } = render(
      <DesignPartnerIntakeHealthCard authorized={false} loading={false} adminRequest={stableAdminRequest} />,
    );
    expect(adminRequest).not.toHaveBeenCalled();

    rerender(
      <DesignPartnerIntakeHealthCard authorized loading={false} adminRequest={stableAdminRequest} />,
    );

    await waitFor(() => {
      expect(adminRequest).toHaveBeenCalledTimes(1);
    });
  });

  it("shows migration attestation copy without implying runtime verification", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildReport({ rate_limiting_enabled: "fail", production_intake_rate_limit_ready: "fail" }),
    });

    render(
      <DesignPartnerIntakeHealthCard authorized loading={false} adminRequest={adminRequest} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("design-partner-intake-health-migration-attestation").textContent).toBe(
        MIGRATION_071_OPERATOR_ATTESTATION.copy,
      );
    });
    expect(screen.getByTestId("design-partner-intake-health-status").textContent).toBe("Misconfigured");
  });

  it("does not render repair actions", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildReport({ intake_route_configured: "fail" }),
    });

    render(
      <DesignPartnerIntakeHealthCard authorized loading={false} adminRequest={adminRequest} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("design-partner-intake-health-status")).toBeTruthy();
    });
    expect(screen.queryByRole("button")).toBeNull();
  });
});
