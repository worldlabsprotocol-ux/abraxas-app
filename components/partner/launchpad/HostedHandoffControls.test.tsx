// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostedHandoffControls } from "./HostedHandoffControls";

afterEach(() => cleanup());

describe("HostedHandoffControls", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      summary: { bindings: [{ binding_id: "primary:app-1", policy_id: "policy-v1", policy_version: 1 }] },
    }), { status: 200 })));
  });

  it("exposes an accessible create action and wrap layout", () => {
    render(<HostedHandoffControls applicationId="app-1" partnerId="good-trouble" />);
    expect(screen.getByRole("heading", { name: "Create a secure handoff" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create a secure handoff" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Handoff docs" })).toHaveAttribute("href", "/docs/hosted-partner-flow-handoff");
  });
});
