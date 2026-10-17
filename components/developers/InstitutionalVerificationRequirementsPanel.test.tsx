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
    expect(screen.getByText(/Step 2 · Choose what to verify/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected for this application/i)).toBeInTheDocument();
    expect(screen.getByText(/Organization protocol access \(sandbox\)/i)).toBeInTheDocument();
  });

  it("offers Launchpad selection when requirement is not yet selected", () => {
    render(<InstitutionalVerificationRequirementsPanel selectedPolicyTemplateId={null} />);
    expect(screen.getByRole("link", { name: /Select in Launchpad/i })).toBeInTheDocument();
  });
});
