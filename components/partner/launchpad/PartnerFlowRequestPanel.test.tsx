// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HolderRequestBriefCard } from "@/components/partner/HolderRequestBriefCard";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience";
import { PARTNER_FLOW_REQUEST_ENTRY } from "@/lib/partner/launchpad/partnerFlowRequest/contract";

afterEach(() => {
  cleanup();
});

describe("Partner Flow request accessible preview", () => {
  it("announces holder preview fields without color-only status", () => {
    const brief = buildHolderRequestBrief({
      partnerName: "Acme",
      policyId: "age_21_retail",
      userExplanation: "Confirm adult retail eligibility",
      environment: "sandbox",
    });
    render(<HolderRequestBriefCard brief={brief} />);
    expect(screen.getByRole("heading", { name: "What this request covers" })).toBeInTheDocument();
    expect(screen.getByText("Shared result category")).toBeInTheDocument();
    expect(screen.getByText(/Sandbox \/ test/i)).toBeInTheDocument();
    expect(PARTNER_FLOW_REQUEST_ENTRY).toBe("Configure Partner Flow");
  });
});
