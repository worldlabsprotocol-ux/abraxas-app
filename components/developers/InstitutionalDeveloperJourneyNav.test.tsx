// @vitest-environment jsdom
// FILE: components/developers/InstitutionalDeveloperJourneyNav.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InstitutionalDeveloperJourneyNav } from "./InstitutionalDeveloperJourneyNav";

describe("InstitutionalDeveloperJourneyNav", () => {
  afterEach(() => cleanup());

  it("renders six task-based journey steps with navigation links", () => {
    render(<InstitutionalDeveloperJourneyNav currentStepId="test_verification" />);
    expect(screen.getByText(/Quick links/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBe(6);
    expect(screen.getByText(/Choose verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Commerce Partner Flow is a separate path/i)).toBeInTheDocument();
  });
});
