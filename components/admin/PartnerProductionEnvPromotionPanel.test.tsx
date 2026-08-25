// @vitest-environment jsdom
// FILE: components/admin/PartnerProductionEnvPromotionPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerProductionEnvPromotionPanel } from "./PartnerProductionEnvPromotionPanel";
import { SITE_URL } from "@/lib/siteUrl";

function stubRuntimeOrigin(origin: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, origin },
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PartnerProductionEnvPromotionPanel", () => {
  it("shows promotion controls on Production runtime origin without client env", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);

    render(<PartnerProductionEnvPromotionPanel />);

    expect(await screen.findByLabelText("Production environment promotion")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("partner_id")).toBeInTheDocument();
    expect(screen.queryByText(/available on the canonical Production deployment only/i)).not.toBeInTheDocument();
  });

  it("shows stub message on demo origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin("https://demo.abraxasworld.xyz");

    render(<PartnerProductionEnvPromotionPanel />);

    expect(await screen.findByText(/available on the canonical Production deployment only/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("partner_id")).not.toBeInTheDocument();
  });
});
