// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PassportHolderWorkspace } from "./PassportHolderWorkspace";

describe("PassportHolderWorkspace navigation", () => {
  it("keeps section content without rendering a second navigation menu", async () => {
    render(
      <PassportHolderWorkspace
        security={<p>Account access</p>}
        verification={<p>Verification status</p>}
        credentials={<p>Stored credentials</p>}
        requests={<p>Partner requests</p>}
        advanced={<p>Privacy and receipt controls</p>}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Passport overview" })).not.toBeInTheDocument();
    expect(document.getElementById("passport-security")).toHaveTextContent("Account access");
    expect(document.getElementById("passport-verification")).toHaveTextContent("Verification status");
    expect(document.getElementById("passport-credentials")).toHaveTextContent("Stored credentials");
    expect(document.getElementById("passport-requests")).toHaveTextContent("Partner requests");

    const controls = screen.getByRole("button", { name: "Consent, receipts, and privacy" });
    const controlsPanelId = controls.getAttribute("aria-controls");
    const controlsPanel = document.getElementById(controlsPanelId ?? "");
    const user = userEvent.setup();

    expect(controls).toHaveAttribute("aria-expanded", "false");
    expect(controlsPanel).toBeInTheDocument();
    expect(controlsPanel).toHaveAttribute("hidden");

    controls.focus();
    await user.keyboard("{Enter}");

    expect(controls).toHaveAttribute("aria-expanded", "true");
    expect(controlsPanel).not.toHaveAttribute("hidden");
    expect(screen.getByText("Privacy and receipt controls")).toBeVisible();
  });
});
