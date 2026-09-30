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

  it("routes holders without a request to Passport", () => {
    render(<VerificationGateway />);
    expect(screen.getByText("Open your Passport")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Passport" })).toHaveAttribute("href", "/passport");
  });

  it("routes partner request deep links to continue flow", () => {
    mockSearchParams.set("verify_request", "vr-test-1");
    render(<VerificationGateway />);
    expect(screen.getByText("Continue your partner verification")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review request" })).toHaveAttribute(
      "href",
      "/partner/continue?verify_request=vr-test-1",
    );
  });
});
