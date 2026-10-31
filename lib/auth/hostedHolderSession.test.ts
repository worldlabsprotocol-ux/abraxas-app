// FILE: lib/auth/hostedHolderSession.test.ts

import { describe, expect, it } from "vitest";
import { isHostedHolderProvider } from "./hostedHolderSession";

describe("hostedHolderSession", () => {
  it("recognizes historical hosted provider records for ownership review", () => {
    expect(isHostedHolderProvider("abraxas_hosted")).toBe(true);
    expect(isHostedHolderProvider("google")).toBe(false);
  });
});
