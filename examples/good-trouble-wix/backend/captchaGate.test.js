// FILE: examples/good-trouble-wix/backend/captchaGate.test.js

import { describe, expect, it, vi } from "vitest";
import { authorizeCaptchaToken } from "./captchaGate.js";

describe("authorizeCaptchaToken", () => {
  it("rejects empty or missing tokens fail-closed", async () => {
    expect(await authorizeCaptchaToken("", vi.fn())).toEqual({
      ok: false,
      code: "captcha_required",
    });
    expect(await authorizeCaptchaToken("   ", vi.fn())).toEqual({
      ok: false,
      code: "captcha_required",
    });
    expect(await authorizeCaptchaToken(null, vi.fn())).toEqual({
      ok: false,
      code: "captcha_required",
    });
  });

  it("rejects when authorize function is not configured", async () => {
    expect(await authorizeCaptchaToken("token", undefined)).toEqual({
      ok: false,
      code: "captcha_not_configured",
    });
  });

  it("accepts successful Wix authorize() resolution", async () => {
    const authorize = vi.fn(async () => undefined);
    expect(await authorizeCaptchaToken("valid-token", authorize)).toEqual({ ok: true });
    expect(authorize).toHaveBeenCalledWith("valid-token");
  });

  it("fails closed when Wix authorize() rejects", async () => {
    const authorize = vi.fn(async () => {
      throw new Error("provider rejected");
    });
    expect(await authorizeCaptchaToken("bad-token", authorize)).toEqual({
      ok: false,
      code: "captcha_invalid",
    });
  });

  it("never returns raw provider errors in the response code", async () => {
    const authorize = vi.fn(async () => {
      throw new Error("secret provider detail");
    });
    const result = await authorizeCaptchaToken("bad-token", authorize);
    expect(result.code).toBe("captcha_invalid");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("provider detail");
  });
});
