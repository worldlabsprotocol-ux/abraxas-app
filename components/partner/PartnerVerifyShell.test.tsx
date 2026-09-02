// @vitest-environment jsdom
// FILE: components/partner/PartnerVerifyShell.test.tsx

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { PartnerVerifyShell, type PartnerVerifyPhase } from "./PartnerVerifyShell";

async function runAxe(container: HTMLElement) {
  return new Promise<axe.AxeResults>((resolve, reject) => {
    axe.run(container, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

const baseProps = {
  partnerName: "Good Trouble",
  policyRequirement: "Confirm eligibility for the requested 21+ policy",
  policyId: "good-trouble-retail-v1",
  correlationId: "pv_ab12cd34",
  signInConfigured: true,
  primaryDisabled: false,
  onSignIn: vi.fn(),
  onTryAgain: vi.fn(),
  partnerReturnLabel: "Return to Good Trouble",
  partnerHomeUrl: "https://www.goodtroublecanna.com/",
};

async function expectAccessibleShell(phase: PartnerVerifyPhase, statusMessage: string) {
  const { container } = render(
    <PartnerVerifyShell
      {...baseProps}
      phase={phase}
      statusMessage={statusMessage}
      primaryDisabled={phase !== "sign_in"}
    />,
  );

  const results = await runAxe(container);
  expect(results.violations).toEqual([]);

  const progress = screen.getAllByRole("list", { name: /Verification progress/i });
  expect(progress.length).toBeGreaterThan(0);

  if (phase === "sign_in" || phase === "signing_in") {
    expect(screen.getByRole("button", { name: /Continue with Google|Signing you in/i })).toBeTruthy();
  }

  if (!["sign_in", "signing_in", "error", "invalid_link"].includes(phase)) {
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe(statusMessage);
  }
}

describe("PartnerVerifyShell institutional UI", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders sign-in state with accessible primary action", async () => {
    await expectAccessibleShell("sign_in", "Sign in to continue with Abraxas.");
    expect(screen.getByRole("heading", { name: /Continue to Good Trouble/i })).toBeTruthy();
    expect(screen.queryByText(/Sign in required in this browser/i)).toBeNull();
  });

  it("has zero axe violations in loading state", async () => {
    await expectAccessibleShell("loading", "Preparing verification…");
  });

  it("has zero axe violations in signing-in state", async () => {
    await expectAccessibleShell("signing_in", "Signing you in…");
  });

  it("has zero axe violations in policy-ready verifying state", async () => {
    await expectAccessibleShell("verifying", "Verification ready.");
  });

  it("renders calm error recovery without raw provider errors", async () => {
    const { container } = render(
      <PartnerVerifyShell
        {...baseProps}
        phase="error"
        statusMessage=""
        correlationId="pv_ab12cd34"
      />,
    );

    const results = await runAxe(container);
    expect(results.violations).toEqual([]);
    expect(screen.getByRole("heading", { name: /couldn't finish signing you in/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeTruthy();
    expect(screen.queryByText(/Sign in required in this browser/i)).toBeNull();
  });

  it("exposes keyboard focus styles and reduced-motion rules", () => {
    const { container } = render(
      <PartnerVerifyShell
        {...baseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    const styleTag = container.ownerDocument.querySelector("style");
    expect(styleTag?.textContent).toMatch(/prefers-reduced-motion: reduce/);
    expect(styleTag?.textContent).toMatch(/focus-visible/);
  });

  it("does not duplicate aria-live announcements for static sign-in copy", () => {
    render(
      <PartnerVerifyShell
        {...baseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });
});
