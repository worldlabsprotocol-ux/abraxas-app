import { describe, expect, it } from "vitest";
import { isConfirmedNoPasskeyResult, type PasskeyCeremonyResult } from "./clientPasskeyCeremony";

describe("isConfirmedNoPasskeyResult", () => {
  it("accepts explicit no_passkey only", () => {
    const result: PasskeyCeremonyResult = {
      ok: false,
      reason: "error",
      code: "no_passkey",
    };
    expect(isConfirmedNoPasskeyResult(result)).toBe(true);
  });

  it("rejects auth timeout and verification failures", () => {
    expect(
      isConfirmedNoPasskeyResult({ ok: false, reason: "error", code: "auth_timeout" }),
    ).toBe(false);
    expect(
      isConfirmedNoPasskeyResult({ ok: false, reason: "error", code: "credential_unknown" }),
    ).toBe(false);
    expect(isConfirmedNoPasskeyResult({ ok: false, reason: "cancelled" })).toBe(false);
  });
});
