// @vitest-environment jsdom
// FILE: components/developers/InstitutionalDeveloperJourneyNav.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InstitutionalDeveloperJourneyNav } from "./InstitutionalDeveloperJourneyNav";

describe("InstitutionalDeveloperJourneyNav", () => {
  afterEach(() => cleanup());

  it("renders eight journey steps with navigation links", () => {
    render(<InstitutionalDeveloperJourneyNav currentStepId="sdk_distribution" />);
    expect(screen.getByText(/Institutional developer journey/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText(/Step 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Obtain the controlled verification SDK/i)).toBeInTheDocument();
  });
});
