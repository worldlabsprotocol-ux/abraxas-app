// FILE: components/admin/DesignPartnerApplicationDetailPanel.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPartnerApplicationDetailPanel } from "@/components/admin/DesignPartnerApplicationDetailPanel";
import type { DesignPartnerApplicationAdminDto } from "@/lib/admin/designPartnerApplicationDetailContract";
import {
  DESIGN_PARTNER_WEBSITE_INERT_WARNING,
  DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL,
} from "@/lib/admin/designPartnerApplicationWebsiteDisplay";

const application: DesignPartnerApplicationAdminDto = {
  id: "app-submitted",
  company: "Test Co",
  contact_name: "Ops",
  email: "hidden@example.com",
  website: "https://example.com",
  integration_type: "passport_gate",
  use_case: "sandbox",
  monthly_volume: "low",
  public_name_ok: false,
  status: "submitted",
  promoted_partner_id: null,
  reviewer_notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  reviewed_at: null,
};

describe("DesignPartnerApplicationDetailPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not fetch when opening details", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<DesignPartnerApplicationDetailPanel application={application} />);
    fireEvent.click(screen.getByTestId("design-partner-detail-toggle-app-submitted"));
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-detail-panel-app-submitted")).toBeTruthy();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders safe HTTPS website link with rel attributes", async () => {
    render(<DesignPartnerApplicationDetailPanel application={application} />);
    fireEvent.click(screen.getByTestId("design-partner-detail-toggle-app-submitted"));
    await waitFor(() => {
      const link = screen.getByTestId("design-partner-website-safe-link") as HTMLAnchorElement;
      expect(link.textContent).toBe(DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL);
      expect(link.getAttribute("href")).toBe("https://example.com/");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });
  });

  it("keeps malicious website values inert", async () => {
    render(
      <DesignPartnerApplicationDetailPanel
        application={{ ...application, website: "javascript:alert(1)" }}
      />,
    );
    fireEvent.click(screen.getByTestId("design-partner-detail-toggle-app-submitted"));
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-website-inert").textContent).toBe("javascript:alert(1)");
      expect(screen.getByTestId("design-partner-website-warning").textContent)
        .toBe(DESIGN_PARTNER_WEBSITE_INERT_WARNING);
      expect(screen.queryByTestId("design-partner-website-safe-link")).toBeNull();
    });
  });

  it("exposes accessible disclosure state", () => {
    render(<DesignPartnerApplicationDetailPanel application={application} />);
    const toggle = screen.getByTestId("design-partner-detail-toggle-app-submitted");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("design-partner-detail-panel-app-submitted").getAttribute("role")).toBe("region");
  });

  it("shows email only inside detail panel", async () => {
    render(<DesignPartnerApplicationDetailPanel application={application} />);
    expect(screen.queryByTestId("design-partner-detail-email")).toBeNull();
    fireEvent.click(screen.getByTestId("design-partner-detail-toggle-app-submitted"));
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-detail-email").textContent).toBe("hidden@example.com");
    });
  });
});
