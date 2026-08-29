// FILE: components/admin/DesignPartnerPromoteReadinessPanel.test.tsx
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPartnerPromoteReadinessPanel } from "@/components/admin/DesignPartnerPromoteReadinessPanel";
import { AdminCopyButton } from "@/components/admin/AdminCopyButton";
import {
  evaluatePartnerIdForPromote,
  PROMOTE_READINESS_ATTESTATION_COPY,
  PROMOTE_READINESS_LINKS,
} from "@/lib/admin/designPartnerPromoteReadiness";

describe("DesignPartnerPromoteReadinessPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders required operator guidance and verified internal links", () => {
    render(
      <DesignPartnerPromoteReadinessPanel
        partnerIdEvaluation={evaluatePartnerIdForPromote("acme-v1")}
      />,
    );

    expect(screen.getByTestId("design-partner-promote-readiness-attestation").textContent)
      .toBe(PROMOTE_READINESS_ATTESTATION_COPY);
    expect(screen.getByTestId("design-partner-promote-readiness-panel").textContent).toContain("abx_test_");
    expect(screen.getByTestId("design-partner-promote-readiness-panel").textContent).toContain("abx_live_");
    expect(screen.getByText(/not persisted or auto-provisioned/i)).toBeTruthy();
    expect(screen.getByTestId("promote-readiness-link-sandbox-docs").getAttribute("href"))
      .toBe(PROMOTE_READINESS_LINKS.sandboxDocs);
    expect(screen.getByTestId("promote-readiness-link-partners-admin").getAttribute("href"))
      .toBe(PROMOTE_READINESS_LINKS.partnersAdmin);
    expect(screen.getByTestId("promote-readiness-link-production").getAttribute("href"))
      .toBe(PROMOTE_READINESS_LINKS.productionActivation);
    expect(screen.getByText(/Availability is confirmed only by the server/i)).toBeTruthy();
  });

  it("shows invalid format feedback without claiming readiness", () => {
    render(
      <DesignPartnerPromoteReadinessPanel
        partnerIdEvaluation={evaluatePartnerIdForPromote("-bad")}
      />,
    );
    expect(screen.getByTestId("design-partner-promote-readiness-partner-id-message").textContent)
      .toContain("valid partner_id format");
    expect(screen.queryByText(/ready to promote/i)).toBeNull();
  });

  it("uses wrapping link layout for mobile-friendly operator navigation", () => {
    const { container } = render(
      <DesignPartnerPromoteReadinessPanel
        partnerIdEvaluation={evaluatePartnerIdForPromote("acme-v1")}
      />,
    );
    const linkRow = container.querySelector('[data-testid="promote-readiness-link-sandbox-docs"]')?.parentElement;
    expect(linkRow?.style.flexWrap).toBe("wrap");
  });

  it("renders copy controls with type=button and 44px touch targets", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { rerender } = render(
      <AdminCopyButton text="abx_test_one" label="Copy sandbox API key" resetKey="one" testId="copy-btn" />,
    );
    const button = screen.getByTestId("copy-btn") as HTMLButtonElement;
    expect(button.type).toBe("button");
    expect(button.style.minHeight).toBe("44px");
    expect(button.style.minWidth).toBe("44px");
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByTestId("copy-btn-status")).toBeTruthy());
    rerender(
      <AdminCopyButton text="abx_test_two" label="Copy sandbox API key" resetKey="two" testId="copy-btn" />,
    );
    expect(screen.queryByTestId("copy-btn-status")).toBeNull();
  });
});
