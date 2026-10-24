// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostedHandoffControls } from "./HostedHandoffControls";

afterEach(() => cleanup());

describe("HostedHandoffControls", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/policy-bindings")) {
          return Response.json({ bindings: [] });
        }
        return Response.json({ ok: false }, { status: 404 });
      }),
    );
  });

  it("exposes handoff section heading and docs link", () => {
    render(
      <HostedHandoffControls
        applicationId="fbea93d2-6660-428d-85c3-8c4e12d89b05"
        partnerId="studio-accept-wc"
      />,
    );
    expect(screen.getByRole("heading", { name: /Hosted wallet verification|Start holder verification/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create handoff" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Handoff docs" })).toHaveAttribute("href", "/docs/hosted-partner-flow-handoff");
  });
});
