// @vitest-environment jsdom
// FILE: components/verification/VerificationGateway.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { VerificationGateway } from "./VerificationGateway";

const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/developers/BuilderActiveTask", () => ({
  BuilderActiveTask: ({
    title,
    description,
    status,
    children,
    action,
    advanced,
  }: {
    title: string;
    description?: string;
    status?: string;
    children?: React.ReactNode;
    action?: React.ReactNode;
    advanced?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {status ? <p>{status}</p> : null}
      {children}
      {action}
      {advanced}
    </section>
  ),
}));

vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

describe("VerificationGateway", () => {
  afterEach(() => {
    cleanup();
    mockSearchParams.delete("verify_request");
    mockSearchParams.delete("request");
  });

  it("does not invent a request when opened without a partner request", () => {
    render(<VerificationGateway />);
    expect(screen.getByRole("heading", { name: "No request to review" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Passport requests" })).toHaveAttribute(
      "href",
      "/passport?view=requests",
    );
    expect(screen.queryByText("Example partner")).not.toBeInTheDocument();
    expect(screen.queryByText("Are you eligible for this service?")).not.toBeInTheDocument();
  });

  it("hands an actual request reference to the review flow without claiming consent", () => {
    mockSearchParams.set("verify_request", "vr test-1&other=value");
    render(<VerificationGateway />);
    expect(screen.getByRole("heading", { name: "Review your partner request" })).toBeInTheDocument();
    expect(screen.getByText(/Request reference:/)).toBeInTheDocument();
    expect(screen.getByText("vr test-1&other=value")).toBeInTheDocument();
    expect(screen.getByText("No consent or verification has happened on this page.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review request" })).toHaveAttribute(
      "href", "/partner/continue?verify_request=vr%20test-1%26other%3Dvalue",
    );
  });

  it("supports the existing request query alias", () => {
    mockSearchParams.set("request", "vr-alias-1");
    render(<VerificationGateway />);
    expect(screen.getByRole("link", { name: "Review request" })).toHaveAttribute(
      "href",
      "/partner/continue?verify_request=vr-alias-1",
    );
  });
});
