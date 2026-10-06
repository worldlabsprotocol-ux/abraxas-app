// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HolderAuthorizationCard } from "@/components/partner/HolderAuthorizationCard";
import { buildHolderAuthorizationCopy } from "@/lib/partner/holderExperience/authorizationCopy";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";

const copy = buildHolderAuthorizationCopy({
  partnerName: "Demo Partner",
  policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
  brief: buildHolderRequestBrief({
    partnerId: "ref-wc-postrev-5ffe",
    policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
    environment: "sandbox",
  }),
  proofSource: "Using your existing verified wallet",
});

describe("HolderAuthorizationCard", () => {
  it("renders concise wallet-control request copy", () => {
    render(<HolderAuthorizationCard phase="request" copy={copy} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("verified wallet");
    expect(screen.getByText(/yes or no/i)).toBeTruthy();
    expect(screen.getByText(/Using your existing verified wallet/i)).toBeTruthy();
  });

  it("renders checking state", () => {
    render(<HolderAuthorizationCard phase="checking" copy={copy} />);
    expect(screen.getByText(/Checking your verified wallet/i)).toBeTruthy();
  });

  it("renders verification-required state without success copy", () => {
    render(
      <HolderAuthorizationCard
        phase="verification_required"
        copy={copy}
        onVerify={() => {}}
      />,
    );
    expect(screen.getByText(/Wallet verification needed/i)).toBeTruthy();
    expect(screen.getByText(/no longer current/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Verify wallet/i })).toBeTruthy();
    expect(screen.queryByText(/Wallet control · Yes/i)).toBeNull();
    expect(screen.queryByText(/^Confirmed$/i)).toBeNull();
  });

  it("renders success state with narrow result summary", () => {
    render(
      <HolderAuthorizationCard
        phase="success"
        copy={copy}
        onReturn={() => {}}
        returnLabel="Return to Partner"
      />,
    );
    expect(screen.getByText(/Wallet control · Yes/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Return to Partner/i })).toBeTruthy();
  });
});
