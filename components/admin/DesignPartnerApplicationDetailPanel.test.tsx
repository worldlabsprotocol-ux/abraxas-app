// FILE: components/admin/DesignPartnerApplicationDetailPanel.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

function renderPanel(app: DesignPartnerApplicationAdminDto = application) {
  return render(
    <DesignPartnerApplicationDetailPanel
      application={app}
      regionId={`design-partner-detail-panel-${app.id}`}
      labelledBy={`design-partner-detail-toggle-${app.id}`}
    />,
  );
}

describe("DesignPartnerApplicationDetailPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders safe HTTPS website link with rel attributes", () => {
    renderPanel();
    const link = screen.getByTestId("design-partner-website-safe-link") as HTMLAnchorElement;
    expect(link.textContent).toBe(DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL);
    expect(link.getAttribute("href")).toBe("https://example.com/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps malicious website values inert", () => {
    renderPanel({ ...application, website: "javascript:alert(1)" });
    expect(screen.getByTestId("design-partner-website-inert").textContent).toBe("javascript:alert(1)");
    expect(screen.getByTestId("design-partner-website-warning").textContent)
      .toBe(DESIGN_PARTNER_WEBSITE_INERT_WARNING);
    expect(screen.queryByTestId("design-partner-website-safe-link")).toBeNull();
  });

  it("exposes accessible region labelling", () => {
    renderPanel();
    const panel = screen.getByTestId("design-partner-detail-panel-app-submitted");
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-labelledby")).toBe("design-partner-detail-toggle-app-submitted");
  });

  it("shows email only inside detail panel body", () => {
    renderPanel();
    expect(screen.getByTestId("design-partner-detail-email").textContent).toBe("hidden@example.com");
  });
});
