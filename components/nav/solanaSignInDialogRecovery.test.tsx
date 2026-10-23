// FILE: components/nav/solanaSignInDialogRecovery.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SolanaAccountSignInDialog } from "./SolanaAccountSignInDialog";

const signMessage = vi.fn();

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: { toBase58: () => "Abcd1234WalletAddressExample111111111111" },
    signMessage,
    connected: true,
    connecting: false,
    connect: vi.fn(),
    select: vi.fn(),
    wallet: { adapter: { name: "Phantom" } },
    wallets: [{ adapter: { name: "Phantom" } }],
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/lib/wallet/useSolanaWalletDiscovery", () => ({
  useSolanaWalletDiscovery: () => ({ offers: [] }),
  PREFERRED_SOLANA_WALLETS: ["Phantom"],
}));

function mockSignInChallenge(challengeId: string) {
  const expires = new Date(Date.now() + 300_000).toISOString();
  return {
    challenge_id: challengeId,
    message: "Sign in to Abraxas",
    expires_at: expires,
    display: {
      kind: "wallet_sign_in" as const,
      action_title: "Abraxas wallet sign-in",
      summary: "Verify control of your wallet to sign in to Abraxas.",
      funds_lines: ["No funds will move."],
      requested_by: "localhost",
      wallet_address: "Abcd1234WalletAddressExample111111111111",
      expires_at: expires,
      challenge_id: challengeId,
    },
  };
}

async function prepareAndSign() {
  fireEvent.click(screen.getByRole("button", { name: /Review sign-in request/i }));
  await waitFor(() => {
    expect(screen.getByText(/Abraxas wallet sign-in/i)).toBeTruthy();
  });
  fireEvent.click(screen.getByRole("button", { name: /Sign in Phantom/i }));
}

describe("SolanaAccountSignInDialog signing recovery", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signMessage.mockReset();
  });

  let challengeCount = 0;
  let verifyCount = 0;

  beforeEach(() => {
    challengeCount = 0;
    verifyCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/native/enabled")) {
          return Response.json({ auth_mode: "ephemeral_wallet" });
        }
        if (url.includes("/api/auth/wallet/solana/challenge")) {
          challengeCount += 1;
          return Response.json({
            ok: true,
            challenge: mockSignInChallenge(`ch_${challengeCount}`),
          });
        }
        if (url.includes("/api/auth/wallet/solana/verify")) {
          verifyCount += 1;
          return Response.json({ ok: true, wallet_address: "Abcd1234WalletAddressExample111111111111" });
        }
        return Response.json({ ok: false }, { status: 404 });
      }),
    );
  });

  it("allows Cancel while waiting for wallet signature", async () => {
    signMessage.mockImplementation(
      () =>
        new Promise<Uint8Array>(() => {
          /* pending */
        }),
    );

    const setBusy = vi.fn();
    render(
      <SolanaAccountSignInDialog
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        busy={false}
        setBusy={setBusy}
        setError={vi.fn()}
      />,
    );

    await prepareAndSign();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Cancel$/i })).toBeTruthy();
    });

    const cancel = screen.getByRole("button", { name: /^Cancel$/i });
    expect(cancel.hasAttribute("disabled")).toBe(false);
    fireEvent.click(cancel);

    await waitFor(() => {
      expect(setBusy).toHaveBeenCalledWith(false);
    });
  });

  it("Try again after dismiss fetches a fresh challenge and avoids late verify", async () => {
    let resolveSign: ((v: Uint8Array) => void) | null = null;
    signMessage.mockImplementation(
      () =>
        new Promise<Uint8Array>((resolve) => {
          resolveSign = resolve;
        }),
    );

    const setBusy = vi.fn();
    render(
      <SolanaAccountSignInDialog
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        busy={false}
        setBusy={setBusy}
        setError={vi.fn()}
      />,
    );

    await prepareAndSign();
    await waitFor(() => {
      expect(screen.getByText(/waiting for your signature/i)).toBeTruthy();
    });
    expect(challengeCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Review sign-in request/i })).toBeTruthy();
    });

    resolveSign?.(new Uint8Array([1, 2]));
    await waitFor(() => {
      expect(verifyCount).toBe(0);
    });
  });

  it("loads native account sign-in review when ephemeral mode is off", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/native/enabled")) {
          return Response.json({ enabled: true, solana_operational: true });
        }
        if (url.includes("/api/auth/native/solana/challenge")) {
          challengeCount += 1;
          const ch = mockSignInChallenge(`native_${challengeCount}`);
          return Response.json({ ok: true, challenge: ch });
        }
        return Response.json({ ok: false }, { status: 404 });
      }),
    );

    render(
      <SolanaAccountSignInDialog
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        busy={false}
        setBusy={vi.fn()}
        setError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Review sign-in request/i }));
    await waitFor(() => {
      expect(screen.getByText(/Abraxas wallet sign-in/i)).toBeTruthy();
    });
    expect(
      screen.queryByText(/Sign-in review is only available for wallet authentication/i),
    ).toBeNull();
  });
});
