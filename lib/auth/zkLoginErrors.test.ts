// FILE: lib/auth/zkLoginErrors.test.ts

import { describe, expect, it } from "vitest";
import { mapZkLoginCompletionError } from "./zkLoginErrors";

describe("mapZkLoginCompletionError", () => {
  it("maps session expired to actionable copy", () => {
    const msg = mapZkLoginCompletionError(new Error("Login session expired. Please sign in again."));
    expect(msg).toMatch(/timed out|did not finish/i);
    expect(msg).toMatch(/Passport/i);
  });

  it("passes through account mismatch messages", () => {
    const raw = "This browser is already signed into Abraxas as a@test.com";
    expect(mapZkLoginCompletionError(new Error(raw))).toBe(raw);
  });
});
