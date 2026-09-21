// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HostedHandoffControls } from "./HostedHandoffControls";

afterEach(() => cleanup());

describe("HostedHandoffControls", () => {
  it("exposes an accessible create action and wrap layout", () => {
    render(<HostedHandoffControls applicationId="app-1" />);
    expect(screen.getByRole("heading", { name: "Create a secure handoff" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create a secure handoff" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Handoff docs" })).toHaveAttribute("href", "/docs/hosted-partner-flow-handoff");
  });
});
