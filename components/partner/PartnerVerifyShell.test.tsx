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
  partnerId: "good-trouble-cannabis",
  partnerName: "Good Trouble",
  policyRequirement: "Complete the verification step required for this purchase.",
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

  expect(screen.getByRole("heading", { name: /Continue with Good Trouble/i })).toBeTruthy();

  if (phase === "sign_in" || phase === "signing_in") {
    expect(screen.getByRole("button", { name: /Continue with Google|Signing you in/i })).toBeTruthy();
  }
}

describe("PartnerVerifyShell customer UI", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders sign-in state with accessible primary action", async () => {
    await expectAccessibleShell("sign_in", "Sign in to continue with Abraxas.");
    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
  });

  it("has zero axe violations in loading state", async () => {
    await expectAccessibleShell("loading", "Preparing verification…");
  });

  it("has zero axe violations in signing-in state", async () => {
    await expectAccessibleShell("signing_in", "Signing you in…");
  });

  it("has zero axe violations in verifying state", async () => {
    await expectAccessibleShell("verifying", "Checking the partner requirement…");
  });

  it("renders calm error recovery with try again", async () => {
    const { container } = render(
      <PartnerVerifyShell
        {...baseProps}
        phase="error"
        statusMessage="Verification could not be completed."
      />,
    );

    const results = await runAxe(container);
    expect(results.violations).toEqual([]);
    expect(screen.getByRole("button", { name: /Try again/i })).toBeTruthy();
  });

  it("shows partner return link on denied state", async () => {
    render(
      <PartnerVerifyShell
        {...baseProps}
        phase="denied"
        statusMessage="This requirement could not be met."
      />,
    );

    expect(screen.getByRole("link", { name: /Return to Good Trouble/i })).toBeTruthy();
  });
});
