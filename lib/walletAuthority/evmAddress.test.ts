import { describe, expect, it } from "vitest";
import { isEvmAddress, normalizeEvmAddress } from "./evmAddress";

describe("evmAddress", () => {
  it("accepts valid hex addresses", () => {
    expect(isEvmAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")).toBe(true);
    expect(normalizeEvmAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")).toBe(
      "0x742d35cc6634c0532925a3b844bc454e4438f44e",
    );
  });

  it("rejects invalid addresses", () => {
    expect(isEvmAddress("not-an-address")).toBe(false);
    expect(() => normalizeEvmAddress("bad")).toThrow("Invalid EVM address format");
  });
});
