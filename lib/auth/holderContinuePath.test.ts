import { describe, expect, it } from "vitest";
import { normalizeHolderContinuePath } from "@/lib/auth/holderContinuePath";

describe("holderContinuePath", () => {
  it("allows Cielo verified-rate paths only", () => {
    expect(normalizeHolderContinuePath("/cielo/verified-rate")).toBe("/cielo/verified-rate");
    expect(normalizeHolderContinuePath("/cielo/verified-rate/confirmation")).toBe(
      "/cielo/verified-rate/confirmation",
    );
    expect(normalizeHolderContinuePath("https://evil.example/cielo/verified-rate")).toBeNull();
    expect(normalizeHolderContinuePath("/partner/verify?x=1")).toBeNull();
  });
});
