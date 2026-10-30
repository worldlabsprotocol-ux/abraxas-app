// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EligibilityPolicyCard } from "./EligibilityPolicyCard";

vi.mock("@/components/product/PrivacyDisclosureCard", () => ({
  PrivacyDisclosureCard: () => <div data-testid="private-disclosure">Detailed sharing contract</div>,
}));

describe("beginner policy tile", () => {
  afterEach(cleanup);

  it("shows one scannable choice and keeps disclosure optional", () => {
    const onSelect = vi.fn();
    render(<EligibilityPolicyCard title="Age 21 eligibility"
      question="Confirm that someone is at least 21 without sharing their date of birth."
      partnerReceives="Yes or no" partnerDoesNotReceive={["Date of birth"]}
      technicalId="age_21_retail" environment="available" selected={false}
      onSelect={onSelect} beginnerTile />);
    expect(screen.getByRole("button", { name: /Age 21 eligibility/ })).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("What is shared").closest("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: /Age 21 eligibility/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("What is shared"));
    expect(screen.getByText("What is shared").closest("details")).toHaveAttribute("open");
  });
});
