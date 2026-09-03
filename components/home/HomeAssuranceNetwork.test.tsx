// @vitest-environment jsdom
// FILE: components/home/HomeAssuranceNetwork.test.tsx

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HomeAssuranceNetwork } from "./HomeAssuranceNetwork";
import {
  ASSURANCE_NETWORK_HEADLINE,
  ASSURANCE_NETWORK_TRANSACTION_HEADLINE,
} from "@/lib/home/assuranceNetworkCopy";

describe("HomeAssuranceNetwork", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders responsively with accessible structure", () => {
    render(<HomeAssuranceNetwork />);

    expect(screen.getByRole("heading", { level: 2, name: ASSURANCE_NETWORK_HEADLINE })).toBeTruthy();
    expect(screen.getByRole("list", { name: /eligibility assurance levels/i })).toBeTruthy();
    expect(screen.getByRole("list", { name: /transaction requirement options/i })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: ASSURANCE_NETWORK_TRANSACTION_HEADLINE })).toBeTruthy();
    expect(screen.getByLabelText(/example policy identifiers/i)).toBeTruthy();
    expect(screen.getByText(/Google sign-in and zkLogin establish account authentication/i)).toBeTruthy();
    expect(screen.getByLabelText(/assurance flow diagram/i)).toBeTruthy();
    expect(screen.getByRole("list", { name: /how abraxas assurance works/i })).toBeTruthy();
    expect(screen.getByText(/Transaction-time ID requirements are policy obligations/i)).toBeTruthy();
  });

  it("does not present transaction ID as the highest evidence level", () => {
    render(<HomeAssuranceNetwork />);
    const evidenceList = screen.getByRole("list", { name: /eligibility assurance levels/i });
    expect(evidenceList.textContent).toContain("Age verified");
    expect(evidenceList.textContent).not.toContain("Transaction ID required");

    const transactionList = screen.getByRole("list", { name: /transaction requirement options/i });
    expect(transactionList.textContent).toContain("Transaction ID required");
  });

  it("exposes section landmark with labelled heading", () => {
    const { container } = render(<HomeAssuranceNetwork />);
    const section = container.querySelector("#assurance-network");
    expect(section).toBeTruthy();
    expect(section?.getAttribute("aria-labelledby")).toBe("assurance-network-heading");
  });
});
