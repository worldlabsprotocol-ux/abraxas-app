// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PassportSolanaSignInButton } from "./PassportSolanaSignInButton";

const mocks = vi.hoisted(() => ({
  wallet: { current: { connected: true, publicKey: { toBase58: () => "wallet-a" }, signMessage: vi.fn() } },
  runAuth: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => mocks.wallet.current }));
vi.mock("@/lib/wallet/passportSolanaAuthClient", () => ({ runPassportSolanaWalletAuth: mocks.runAuth }));

describe("PassportSolanaSignInButton wallet lifecycle", () => {
  beforeEach(() => {
    mocks.runAuth.mockReset();
    mocks.wallet.current = {
      connected: true,
      publicKey: { toBase58: () => "wallet-a" },
      signMessage: vi.fn(),
    };
  });

  afterEach(cleanup);

  it("does not complete an in-flight sign-in after the wallet account changes", async () => {
    let finish!: (value: { ok: true }) => void;
    mocks.runAuth.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const onSuccess = vi.fn();
    const view = render(<PassportSolanaSignInButton onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with Solana wallet" }));
    await waitFor(() => expect(mocks.runAuth).toHaveBeenCalledOnce());
    const attempt = mocks.runAuth.mock.calls[0][0].attempt;

    mocks.wallet.current = {
      connected: true,
      publicKey: { toBase58: () => "wallet-b" },
      signMessage: vi.fn(),
    };
    view.rerender(<PassportSolanaSignInButton onSuccess={onSuccess} />);
    await waitFor(() => expect(attempt.isStale()).toBe(true));
    finish({ ok: true });
    await waitFor(() => expect(screen.getByText(/Wallet changed/)).toBeTruthy());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
