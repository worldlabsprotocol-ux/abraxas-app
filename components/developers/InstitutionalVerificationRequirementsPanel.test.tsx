// @vitest-environment jsdom
// FILE: components/developers/InstitutionalVerificationRequirementsPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InstitutionalVerificationRequirementsPanel } from "./InstitutionalVerificationRequirementsPanel";

describe("InstitutionalVerificationRequirementsPanel", () => {
  afterEach(() => cleanup());

  it("highlights selected institutional protocol access requirement", () => {
    render(
      <InstitutionalVerificationRequirementsPanel
        selectedPolicyTemplateId="sandbox_institutional_protocol_access"
      />,
    );
    expect(screen.getByText(/Choose verification/i)).toBeInTheDocument();
    expect(screen.getByText(/^Selected$/i)).toBeInTheDocument();
    expect(screen.getByText(/Protocol access \(sandbox\)/i)).toBeInTheDocument();
  });

  it("offers Launchpad selection when requirement is not yet selected", () => {
    render(<InstitutionalVerificationRequirementsPanel selectedPolicyTemplateId={null} />);
    expect(screen.getByRole("link", { name: /^Select$/i })).toBeInTheDocument();
  });
});
