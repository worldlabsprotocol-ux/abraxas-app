// FILE: components/product/productUx.test.tsx
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { PrivacyDisclosureCard } from "./PrivacyDisclosureCard";
import { TrustStatus } from "./TrustStatus";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { PilotCriteriaList } from "./PilotCriteriaList";
import { HomeArchitectureFlow } from "./HomeArchitectureFlow";
import { ProductOutcomeState } from "./ProductOutcomeState";
import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

afterEach(() => cleanup());

describe("product UX primitives", () => {
  it("renders requested / shared / withheld on PrivacyDisclosureCard", () => {
    const { container } = render(
      <PrivacyDisclosureCard
        requester="Good Trouble"
        requestReason="Age eligibility for this transaction"
        requested={[{ label: "Are you 21 or older?" }]}
        shared={[{ label: "21+ eligibility: Yes" }]}
        withheld={[{ label: "Date of birth" }, { label: "ID document" }]}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Who is asking");
    expect(text).toContain("Good Trouble");
    expect(text).toContain("Requested");
    expect(text).toContain("Shared");
    expect(text).toContain("Withheld");
    expect(text).toContain("Are you 21 or older?");
    expect(text).toContain("21+ eligibility: Yes");
  });

  it("renders holder-friendly trust statuses", () => {
    render(
      <TrustStatus
        audience="holder"
        items={[{ kind: "verified" }, { kind: "current" }, { kind: "reusable" }]}
      />,
    );
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("Reusable")).toBeTruthy();
  });

  it("distinguishes sandbox and production environments", () => {
    const { rerender } = render(<EnvironmentBadge environment="sandbox" />);
    expect(screen.getByText("Sandbox")).toBeTruthy();
    rerender(<EnvironmentBadge environment="production" />);
    expect(screen.getByText("Production")).toBeTruthy();
  });

  it("humanizes pilot criteria labels", () => {
    const { container } = render(
      <PilotCriteriaList
        criteria={[
          { criterion_type: "first_successful_verification", status: "met", measured_value: 1 },
          { criterion_type: "evidence_reuse_observed", status: "pending" },
        ]}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("First successful verification");
    expect(text).toContain("Evidence reuse observed");
  });

  it("communicates architecture on homepage flow component", () => {
    const { container } = render(<HomeArchitectureFlow />);
    const text = container.textContent ?? "";
    expect(text).toContain("Abraxas Passport");
    expect(text).toContain("Signed eligibility receipt");
    expect(text).toContain("Application receives");
    expect(text).toContain("Application does not receive");
  });

  it("renders actionable empty and error outcome states", () => {
    const { rerender } = render(
      <ProductOutcomeState
        kind="empty"
        title="No partner requests yet"
        detail="Requests appear here when a partner asks for private proof."
        actionLabel="Review activity"
        href="/passport?view=activity"
      />,
    );
    expect(screen.getByText("No partner requests yet")).toBeTruthy();
    rerender(
      <ProductOutcomeState
        kind="error"
        title="Could not load requests"
        detail="Try again in a moment."
        actionLabel="Try again"
        onAction={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("derives holder-facing Good Trouble request copy from policy presentation", () => {
    const copy = buildHolderRequestPresentation("Good Trouble", GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(copy.requestHeadline).toContain("Good Trouble wants to confirm");
    expect(copy.sharedResult[0]?.label.toLowerCase()).toMatch(/21|eligible/);
  });
});
