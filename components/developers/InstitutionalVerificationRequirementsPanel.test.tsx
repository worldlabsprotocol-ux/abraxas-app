// @vitest-environment jsdom
// FILE: components/developers/InstitutionalVerificationRequirementsPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstitutionalVerificationRequirementsPanel } from "./InstitutionalVerificationRequirementsPanel";

describe("InstitutionalVerificationRequirementsPanel", () => {
  afterEach(() => cleanup());

  it("shows concise institutional protocol access selection without Google copy", () => {
    render(
      <InstitutionalVerificationRequirementsPanel
        selectedPolicyTemplateId="sandbox_institutional_protocol_access"
      />,
    );
    expect(screen.getAllByText(/Choose verification/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Institutional protocol access$/)).toBeInTheDocument();
    expect(screen.getByText(/^Status: Selected$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Continue$/i })).toBeInTheDocument();
    expect(screen.queryByText(/Google/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Technical details/i)).toBeInTheDocument();
  });

  it("offers Select when requirement is not yet selected", () => {
    render(<InstitutionalVerificationRequirementsPanel selectedPolicyTemplateId={null} />);
    expect(screen.getByRole("link", { name: /^Select$/i })).toBeInTheDocument();
  });

  it("calls onContinue for embedded institutional launchpad flow", () => {
    const onContinue = vi.fn();
    render(
      <InstitutionalVerificationRequirementsPanel
        embedded
        selectedPolicyTemplateId="sandbox_institutional_protocol_access"
        onContinue={onContinue}
      />,
    );
    screen.getByRole("button", { name: /^Continue$/i }).click();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
