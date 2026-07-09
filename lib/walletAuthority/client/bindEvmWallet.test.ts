// FILE: lib/walletAuthority/client/bindEvmWallet.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  connectEvmWallet,
  signEvmPersonalMessage,
  type EthereumProvider,
} from "@/lib/walletAuthority/client/ethereumProvider";
import { bindEvmWalletToPassport } from "@/lib/walletAuthority/client/bindEvmWallet";

const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const TEST_MESSAGE = "abraxas-app.vercel.app wants you to sign in with your Ethereum account:";
const TEST_SIGNATURE = "0x" + "ab".repeat(65);

function createMockProvider(): EthereumProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    request: vi.fn(async ({ method }: { method: string }) => {
      calls.push(method);
      if (method === "eth_requestAccounts") return [TEST_ADDRESS];
      if (method === "eth_chainId") return "0x1";
      if (method === "personal_sign") return TEST_SIGNATURE;
      throw new Error(`Unexpected method: ${method}`);
    }),
  };
}

describe("connectEvmWallet", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { ethereum: createMockProvider() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("awaits eth_requestAccounts and eth_chainId before returning", async () => {
    const provider = createMockProvider();
    (window as unknown as { ethereum: EthereumProvider }).ethereum = provider;

    const connection = await connectEvmWallet();
    expect(connection.address).toBe(TEST_ADDRESS);
    expect(connection.chainId).toBe(1);
    expect(provider.calls).toEqual(["eth_requestAccounts", "eth_chainId"]);
  });
});

describe("signEvmPersonalMessage", () => {
  it("calls personal_sign only after provider is available", async () => {
    const provider = createMockProvider();
    const sig = await signEvmPersonalMessage(provider, TEST_MESSAGE, TEST_ADDRESS);
    expect(sig).toBe(TEST_SIGNATURE);
    expect(provider.request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [TEST_MESSAGE, TEST_ADDRESS],
    });
  });
});

describe("bindEvmWalletToPassport", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { ethereum: createMockProvider() });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/wallet-authority/evm/challenge")) {
        return new Response(JSON.stringify({
          challenge_id: "ch_test",
          message: TEST_MESSAGE,
        }), { status: 200 });
      }
      if (url.includes("/api/wallet-authority/evm/bind")) {
        return new Response(JSON.stringify({
          ok: true,
          binding_id: "bind-1",
          binding_status: "active",
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("connects wallet before challenge, signs before bind", async () => {
    const provider = createMockProvider();
    (window as unknown as { ethereum: EthereumProvider }).ethereum = provider;

    const result = await bindEvmWalletToPassport();
    expect(result.address).toBe(TEST_ADDRESS);
    expect(result.binding_id).toBe("bind-1");
    expect(provider.calls[0]).toBe("eth_requestAccounts");
    expect(provider.calls[1]).toBe("eth_chainId");
    expect(provider.calls[2]).toBe("personal_sign");
    expect(provider.calls.indexOf("personal_sign")).toBeGreaterThan(
      provider.calls.indexOf("eth_requestAccounts"),
    );
  });

  it("rejects mismatched expected wallet address", async () => {
    await expect(
      bindEvmWalletToPassport({ expectedWalletAddress: "0x0000000000000000000000000000000000000001" }),
    ).rejects.toThrow(/does not match/i);
  });
});
