// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuilderActiveTask } from "./BuilderActiveTask";

vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span data-testid="official-emblem" /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({
  AbraxasJourneyEmblemStatus: ({ state }: { state: string }) => <span role="status">{state}</span>,
}));

describe("canonical active task", () => {
  afterEach(cleanup);

  it("moves focus when the active task replaces the previous task", () => {
    const { rerender } = render(<BuilderActiveTask taskKey="create" title="Create your test app" />);
    expect(screen.getByRole("heading", { name: "Create your test app" })).toHaveFocus();
    rerender(<BuilderActiveTask taskKey="test" title="Run a sandbox test" />);
    expect(screen.queryByRole("heading", { name: "Create your test app" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run a sandbox test" })).toHaveFocus();
    expect(screen.getAllByTestId("official-emblem")).toHaveLength(1);
  });

  it("shows pending, failure recovery, and advanced details only when requested", () => {
    const { rerender } = render(<BuilderActiveTask taskKey="test" title="Running your test" state="pending" />);
    expect(screen.getByRole("status")).toHaveTextContent("preparing_workspace");
    rerender(<BuilderActiveTask taskKey="test" title="Your test needs attention" state="failure"
      error="Try the test again" action={<button>Try test again</button>}
      advanced={<details><summary>Technical details</summary><p>Diagnostic detail</p></details>} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Try the test again");
    expect(screen.getByRole("button", { name: "Try test again" })).toBeEnabled();
    expect(screen.getByText("Technical details").closest("details")).not.toHaveAttribute("open");
  });
});
