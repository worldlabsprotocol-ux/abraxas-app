// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HomeTrustContinuousArchitectureImage } from "@/components/home/HomeTrustContinuousArchitectureImage";

describe("homepage trust architecture visual", () => {
  afterEach(cleanup);

  it("shows one ordered request-to-enforcement flow with the official emblem", () => {
    const { container } = render(<HomeTrustContinuousArchitectureImage />);
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.querySelector("h3")?.textContent)).toEqual([
      "Application request",
      "Authorized evidence",
      "Signed decision",
      "Verify and enforce",
    ]);
    expect(container.querySelector('img[src*="abraxas-living-sphere-nav-256.jpg"]')).toBeTruthy();
    expect(screen.getByText(/expiration, revocation, and freshness/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
