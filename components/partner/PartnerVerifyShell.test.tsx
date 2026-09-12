// @vitest-environment jsdom
// FILE: components/partner/PartnerVerifyShell.test.tsx

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON,
  GOOD_TROUBLE_BROWSE_SIGN_IN_CLARIFICATION,
  GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO,
  GOOD_TROUBLE_BROWSE_SIGN_IN_PRIVACY_COPY,
  GOOD_TROUBLE_BROWSE_SIGN_IN_PROHIBITED_PHRASES,
  GOOD_TROUBLE_BROWSE_SIGN_IN_STATUS,
  GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_COPY,
  GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_HEADING,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { PartnerVerifyShell, type PartnerVerifyPhase } from "./PartnerVerifyShell";

async function runAxe(container: HTMLElement) {
  return new Promise<axe.AxeResults>((resolve, reject) => {
    axe.run(container, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

const onSignIn = vi.fn();

const baseProps = {
  partnerId: GOOD_TROUBLE_PARTNER_ID,
  partnerName: "Good Trouble",
  policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
  purpose: "purchase",
  isDobFirstBrowse: false,
  policyRequirement: "Complete the verification step required for this purchase.",
  signInConfigured: true,
  primaryDisabled: false,
  onSignIn,
  onTryAgain: vi.fn(),
  partnerReturnLabel: "Return to Good Trouble",
  partnerHomeUrl: "https://www.goodtroublecanna.com/",
};

const dobFirstBrowseProps = {
  ...baseProps,
  policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
  purpose: "browse",
  isDobFirstBrowse: true,
};

async function expectAccessibleShell(
  props: typeof baseProps,
  phase: PartnerVerifyPhase,
  statusMessage: string,
) {
  const { container } = render(
    <PartnerVerifyShell
      {...props}
      phase={phase}
      statusMessage={statusMessage}
      primaryDisabled={phase !== "sign_in"}
    />,
  );

  const results = await runAxe(container);
  expect(results.violations).toEqual([]);

  expect(screen.getByRole("heading", { name: /Continue with Good Trouble/i })).toBeTruthy();

  if (phase === "sign_in" || phase === "signing_in") {
    const buttonLabel = props.isDobFirstBrowse
      ? /Create or open my Passport|Signing you in/i
      : /Continue with Google|Signing you in/i;
    expect(screen.getByRole("button", { name: buttonLabel })).toBeTruthy();
  }
}

describe("PartnerVerifyShell customer UI", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders sign-in state with accessible primary action", async () => {
    await expectAccessibleShell(baseProps, "sign_in", "Sign in to continue with Abraxas.");
    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
  });

  it("has zero axe violations in loading state", async () => {
    await expectAccessibleShell(baseProps, "loading", "Preparing verification…");
  });

  it("has zero axe violations in signing-in state", async () => {
    await expectAccessibleShell(baseProps, "signing_in", "Signing you in…");
  });

  it("has zero axe violations in verifying state", async () => {
    await expectAccessibleShell(baseProps, "verifying", "Checking the partner requirement…");
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

describe("PartnerVerifyShell Good Trouble DOB-first browse sign-in copy", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows Passport value copy for the exact Good Trouble browse tuple", () => {
    render(
      <PartnerVerifyShell
        {...dobFirstBrowseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO)).toBeTruthy();
    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SIGN_IN_STATUS)).toBeTruthy();
    expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON })).toBeTruthy();
    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_HEADING)).toBeTruthy();
    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_COPY)).toBeTruthy();
    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SIGN_IN_PRIVACY_COPY)).toBeTruthy();
    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SIGN_IN_CLARIFICATION)).toBeTruthy();
  });

  it("does not show DOB-first sign-in copy for retail policy with browse purpose", () => {
    render(
      <PartnerVerifyShell
        {...baseProps}
        policyId={GOOD_TROUBLE_RETAIL_POLICY_ID}
        purpose="browse"
        isDobFirstBrowse={false}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    expect(screen.queryByText(GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO)).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
  });

  it("does not show DOB-first sign-in copy for browse policy with purchase purpose", () => {
    render(
      <PartnerVerifyShell
        {...baseProps}
        policyId={GOOD_TROUBLE_BROWSE_POLICY_ID}
        purpose="purchase"
        isDobFirstBrowse={false}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    expect(screen.queryByText(GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO)).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
  });

  it("does not show DOB-first sign-in copy for another partner", () => {
    render(
      <PartnerVerifyShell
        {...dobFirstBrowseProps}
        partnerId="example-partner"
        partnerName="Example Partner"
        isDobFirstBrowse={false}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    expect(screen.queryByText(GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO)).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
  });

  it("keeps generic regulated purchase wording unchanged", () => {
    render(
      <PartnerVerifyShell
        {...baseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
    expect(screen.getByText(/policy result/i)).toBeTruthy();
    expect(screen.getByText(/Signing in confirms your account only/i)).toBeTruthy();
    expect(screen.queryByText(GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO)).toBeNull();
  });

  it("does not claim to create a Good Trouble customer account", () => {
    const { container } = render(
      <PartnerVerifyShell
        {...dobFirstBrowseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/create(?:s|d)?\s+(?:a\s+)?Good Trouble customer account/i);
    expect(text).toContain("A Good Trouble customer account can be added separately in the future.");
  });

  it("contains no prohibited technical phrases on the DOB-first sign-in screen", () => {
    const { container } = render(
      <PartnerVerifyShell
        {...dobFirstBrowseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    const text = container.textContent ?? "";
    for (const phrase of GOOD_TROUBLE_BROWSE_SIGN_IN_PROHIBITED_PHRASES) {
      expect(text).not.toContain(phrase);
    }
    expect(text).not.toContain("Confirm you're 21+");
  });

  it("wires the Google button to the provided sign-in handler", () => {
    render(
      <PartnerVerifyShell
        {...dobFirstBrowseProps}
        phase="sign_in"
        statusMessage="Sign in to continue with Abraxas."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
