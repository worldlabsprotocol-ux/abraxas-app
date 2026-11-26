// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DevnetEntitlementTestClient } from "./DevnetEntitlementTestClient";

const founder = "3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd";
const bridge = vi.hoisted(() => ({
  selected: false,
  connected: false,
  publicKey: null as null | PublicKey,
  select: vi.fn(),
  connect: vi.fn(async () => {}),
  disconnect: vi.fn(async () => {}),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    wallets: [{ adapter: { name: "Phantom" }, readyState: "Installed" }],
    wallet: bridge.selected ? { adapter: { name: "Phantom" } } : null,
    select: bridge.select,
    connect: bridge.connect,
    disconnect: bridge.disconnect,
    connected: bridge.connected,
    connecting: false,
    publicKey: bridge.publicKey,
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
  }),
}));

beforeEach(() => {
  bridge.selected = false;
  bridge.connected = false;
  bridge.publicKey = null;
  bridge.select.mockReset();
  bridge.connect.mockClear();
  bridge.disconnect.mockClear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ executionEnabled: false, approvedCeilingLamports: null }),
  })));
});

describe("Devnet Phantom connection", () => {
  it("connects after selection, supports disconnect and explicit reconnect without enabling execution", async () => {
    const { rerender } = render(<DevnetEntitlementTestClient />);
    fireEvent.click(screen.getByRole("button", { name: "Connect Phantom" }));
    expect(bridge.select).toHaveBeenCalledWith("Phantom");
    expect(bridge.connect).not.toHaveBeenCalled();

    bridge.selected = true;
    rerender(<DevnetEntitlementTestClient />);
    await waitFor(() => expect(bridge.connect).toHaveBeenCalledTimes(1));

    bridge.connected = true;
    bridge.publicKey = new PublicKey(founder);
    rerender(<DevnetEntitlementTestClient />);
    expect(screen.getByText(new RegExp(founder))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare isolated test" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }));
    await waitFor(() => expect(bridge.disconnect).toHaveBeenCalledTimes(1));
    bridge.connected = false;
    bridge.publicKey = null;
    rerender(<DevnetEntitlementTestClient />);
    expect(bridge.connect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Connect Phantom" }));
    await waitFor(() => expect(bridge.connect).toHaveBeenCalledTimes(2));
  });
});
