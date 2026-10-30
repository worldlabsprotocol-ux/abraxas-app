// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeSandboxAccountAuth } from "./HomeSandboxAccountAuth";

vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({ AbraxasJourneyEmblemStatus: () => <span /> }));
vi.mock("@/components/account/NativeAccountSolanaPanel", () => ({ NativeAccountSolanaPanel: () => <button>Continue with wallet</button> }));
vi.mock("@/components/account/NativeAccountPasskeyPanel", () => ({ NativeAccountPasskeyPanel: ({ label }: { label: string }) => <button>{label}</button> }));

describe("homepage account task", () => {
  afterEach(cleanup);
  it("keeps wallet as the visible action and passkeys behind an explicit choice", () => {
    render(<HomeSandboxAccountAuth onAccountReady={() => {}} />);
    expect(screen.getByRole("heading", { name: "Connect to continue" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue with wallet" })).toBeVisible();
    const advanced = screen.getByText("Use a passkey instead").closest("details");
    expect(advanced).not.toHaveAttribute("open");
  });
});
