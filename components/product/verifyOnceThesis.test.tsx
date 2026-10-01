// FILE: components/product/verifyOnceThesis.test.tsx
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { VerifyOnceThesisDiagram } from "./VerifyOnceThesisDiagram";
import { HolderRequestFlowStrip } from "./HolderRequestFlowStrip";
import { HolderDecisionComplete } from "@/components/protocol/HolderDecisionComplete";
import {
  THESIS_APPLICATION_ASKS,
  THESIS_PROTECTED_EVIDENCE,
  VERIFY_ONCE_THESIS_HEADLINE,
  VERIFY_ONCE_THESIS_LEGEND,
} from "@/lib/product/verifyOnceThesisCopy";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

afterEach(() => cleanup());

describe("VerifyOnceThesisDiagram", () => {
  it("renders thesis headline and protected evidence without relying on animation", () => {
    render(<VerifyOnceThesisDiagram />);

    expect(screen.getByRole("heading", { name: VERIFY_ONCE_THESIS_HEADLINE })).toBeTruthy();
    expect(screen.getByText(VERIFY_ONCE_THESIS_LEGEND)).toBeTruthy();
    expect(screen.getByLabelText(/Stays inside Abraxas/i)).toBeTruthy();

    for (const item of THESIS_PROTECTED_EVIDENCE) {
      expect(screen.getByText(item)).toBeTruthy();
    }

    for (const ask of THESIS_APPLICATION_ASKS) {
      expect(screen.getByText(ask.question)).toBeTruthy();
    }
    expect(screen.getAllByText(/Yes ✓/).length).toBeGreaterThanOrEqual(THESIS_APPLICATION_ASKS.length);
  });

  it("exposes static diagram semantics for assistive technology", () => {
    render(<VerifyOnceThesisDiagram />);
    expect(screen.getByRole("img", { name: VERIFY_ONCE_THESIS_LEGEND })).toBeTruthy();
  });
});

describe("HolderRequestFlowStrip", () => {
  it("shows partner question → Passport → minimal answer", () => {
    render(
      <HolderRequestFlowStrip
        partnerName="Good Trouble"
        question="Are you 21 or older?"
        sharedLabel="21+ eligibility"
      />,
    );

    const strip = screen.getByRole("img", {
      name: /Good Trouble asks a question; your Passport returns 21\+ eligibility only/i,
    });
    expect(strip.textContent).toContain("Good Trouble");
    expect(strip.textContent).toContain("Are you 21 or older?");
    expect(strip.textContent).toContain("Your Passport");
    expect(strip.textContent).toContain("21+ eligibility");
  });
});

describe("HolderDecisionComplete", () => {
  it("keeps explicit Return to partner and receipt under disclosure", () => {
    render(
      <HolderDecisionComplete
        receiptId="rcpt_test_123"
        partnerName="Good Trouble"
        policyId={GOOD_TROUBLE_RETAIL_POLICY_ID}
        onReturn={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Return to partner" })).toBeTruthy();
    expect(screen.getByText("Verification details")).toBeTruthy();
    expect(screen.getByText(/Only the approved result was shared/i)).toBeTruthy();
  });
});
