// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PassportPageClient } from "./PassportPageClient";

const mocks = vi.hoisted(() => ({
  connected: false,
  state: { kind: "other" } as { kind: string; holderSubjectId?: string },
  refresh: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ connected: mocks.connected }),
}));
vi.mock("@/lib/passport/useSolanaPassportSession", () => ({
  useSolanaPassportSession: () => ({ state: mocks.state, refresh: mocks.refresh }),
}));
vi.mock("@/components/design/AbxPageShell", () => ({
  AbxPageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/passport/PassportSolanaWalletConnection", () => ({
  PassportSolanaWalletConnection: () => <button>Connect wallet</button>,
}));
vi.mock("@/components/passport/PassportSolanaSignInButton", () => ({
  PassportSolanaSignInButton: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Open my Passport</button>
  ),
}));
vi.mock("@/components/passport/PassportSolanaWorkspace", () => ({
  PassportSolanaWorkspace: ({ holderSubjectId }: { holderSubjectId: string }) => (
    <div data-testid="private-passport">{holderSubjectId}</div>
  ),
}));
vi.mock("@/components/passport/PartnerVerificationResumeCta", () => ({
  PartnerVerificationResumeCta: () => null,
}));
vi.mock("@/components/product/AccountAccessFirstPaint", () => ({
  AccountAccessFirstPaint: () => <div>Loading Passport</div>,
}));
vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

afterEach(() => {
  cleanup();
  mocks.connected = false;
  mocks.state = { kind: "other" };
  mocks.refresh.mockReset();
});

describe("wallet-native Passport entry", () => {
  it("offers one wallet action without Google setup when signed out", () => {
    render(<PassportPageClient />);
    expect(screen.getByRole("heading", { name: "Your wallet. Your Passport." })).toBeVisible();
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeVisible();
    expect(screen.queryByText(/Google|setup step/i)).toBeNull();
    expect(screen.queryByTestId("private-passport")).toBeNull();
  });

  it("requires wallet authentication before showing private Passport state", () => {
    mocks.connected = true;
    render(<PassportPageClient />);
    expect(screen.getByRole("button", { name: "Open my Passport" })).toBeVisible();
    expect(screen.queryByTestId("private-passport")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open my Passport" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the bound Passport only for an authenticated session", () => {
    mocks.connected = true;
    mocks.state = { kind: "authenticated", holderSubjectId: "abx_hs_example" };
    render(<PassportPageClient />);
    expect(screen.getByTestId("private-passport")).toHaveTextContent("abx_hs_example");
    expect(screen.queryByRole("button", { name: "Open my Passport" })).toBeNull();
  });

  it("keeps private data hidden after wallet mismatch or backend failure", () => {
    mocks.connected = true;
    mocks.state = { kind: "reconnect" };
    const view = render(<PassportPageClient />);
    expect(screen.getByText(/Connect the wallet that opened this Passport/)).toBeVisible();
    expect(screen.queryByTestId("private-passport")).toBeNull();
    mocks.state = { kind: "unavailable" };
    view.rerender(<PassportPageClient />);
    expect(screen.queryByTestId("private-passport")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});

