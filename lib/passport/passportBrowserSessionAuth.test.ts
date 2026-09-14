// FILE: lib/passport/passportBrowserSessionAuth.test.ts

import { describe, expect, it } from "vitest";
import {
  BROWSER_SESSION_AUTH_ERROR,
  isBrowserSessionAuthError,
  isBrowserSessionAuthFailure,
} from "./passportBrowserSessionAuth";

describe("passportBrowserSessionAuth", () => {
  it("detects canonical browser session auth errors", () => {
    expect(isBrowserSessionAuthError(BROWSER_SESSION_AUTH_ERROR)).toBe(true);
    expect(isBrowserSessionAuthError("Sign in again — OAuth session expired")).toBe(true);
    expect(isBrowserSessionAuthError("Wallet binding repair failed")).toBe(false);
  });

  it("treats 401 responses with session copy as auth failures", () => {
    expect(isBrowserSessionAuthFailure(401, BROWSER_SESSION_AUTH_ERROR)).toBe(true);
    expect(isBrowserSessionAuthFailure(401)).toBe(true);
    expect(isBrowserSessionAuthFailure(500, BROWSER_SESSION_AUTH_ERROR)).toBe(false);
  });
});
