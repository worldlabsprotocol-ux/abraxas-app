// @vitest-environment jsdom
// FILE: components/home/defi/HomeTrustPipelineStrip.test.tsx

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeTrustPipelineStrip } from "@/components/home/defi/HomeTrustPipelineStrip";

describe("HomeTrustPipelineStrip", () => {
  it("updates visible panel content when a stage is selected", () => {
    render(<HomeTrustPipelineStrip />);
    expect(screen.getByRole("tabpanel").textContent).toMatch(/Issuer authority and pinned trust/i);

    fireEvent.click(screen.getByRole("tab", { name: /Independent verification/i }));
    expect(screen.getByRole("tabpanel").textContent).toMatch(/Independent relying-party verification/i);
    expect(screen.getByRole("tab", { name: /Independent verification/i }).getAttribute("aria-selected")).toBe("true");
  });
});
