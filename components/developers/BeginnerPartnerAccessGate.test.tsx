// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BeginnerPartnerAccessGate } from "./BeginnerPartnerAccessGate";

const auth = vi.hoisted(() => ({
  account: vi.fn(),
  key: vi.fn(),
}));
vi.mock("@/lib/partner/launchpad/launchpadSessionClient", () => ({
  establishLaunchpadSessionWithAccount: auth.account,
  establishLaunchpadSessionWithApiKey: auth.key,
}));
vi.mock("@/components/account/NativeAccountSolanaPanel", () => ({
  NativeAccountSolanaPanel: () => <div data-testid="inline-wallet-sign-in" />,
}));
vi.mock("@/components/account/NativeAccountPasskeyPanel", () => ({
  NativeAccountPasskeyPanel: () => <div data-testid="inline-passkey-sign-in" />,
}));
vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span data-testid="official-emblem" /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({
  AbraxasJourneyEmblemStatus: () => <span role="status" />,
}));
vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={disabled}>{children}</button>,
}));

describe("inline partner access recovery", () => {
  afterEach(() => { cleanup(); auth.account.mockReset(); auth.key.mockReset(); vi.unstubAllGlobals(); });

  it("restores the exact app without navigating", async () => {
    auth.account.mockResolvedValue({ ok: true });
    const onReady = vi.fn();
    render(<BeginnerPartnerAccessGate applicationId="app-123" onReady={onReady} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with your account" }));
    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(auth.account).toHaveBeenCalledWith({ applicationId: "app-123" });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("hides internal error codes and offers in-place account sign-in", async () => {
    auth.account.mockResolvedValue({ ok: false, status: 400, code: "partner_id_required" });
    render(<BeginnerPartnerAccessGate applicationId="app-123" onReady={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with your account" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("We could not open this app"));
    expect(screen.queryByText("partner_id_required")).not.toBeInTheDocument();
    auth.account.mockResolvedValue({ ok: false, status: 401 });
    fireEvent.click(screen.getByRole("button", { name: "Continue with your account" }));
    await waitFor(() => expect(screen.getByTestId("inline-wallet-sign-in")).toBeInTheDocument());
  });

  it("rejects a sandbox key for another app", async () => {
    auth.key.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ workspace: { applications: [{ id: "other-app" }] } }) }));
    const onReady = vi.fn();
    render(<BeginnerPartnerAccessGate applicationId="app-123" onReady={onReady} />);
    fireEvent.click(screen.getByText("Use a sandbox key"));
    fireEvent.change(screen.getByLabelText("Sandbox key"), { target: { value: "secret-test-value" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with key" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("does not belong to this app"));
    expect(onReady).not.toHaveBeenCalled();
    expect(screen.queryByText("secret-test-value")).not.toBeInTheDocument();
  });
});
