// @vitest-environment jsdom
// FILE: lib/sui/zklogin/loginInFlight.partnerVerify.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLoginInFlight,
  clearStaleLoginInFlight,
  isLoginInFlight,
  setLoginInFlight,
} from "./loginInFlight";

describe("loginInFlight partner verify recovery", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("blocks duplicate starts while in flight", () => {
    setLoginInFlight(true);
    expect(isLoginInFlight()).toBe(true);
  });

  it("clears stale in-progress lock after timeout", () => {
    sessionStorage.setItem("abraxas_zklogin_login_in_flight", "1");
    sessionStorage.setItem("abraxas_zklogin_login_in_flight_ts", String(Date.now() - 91_000));
    clearStaleLoginInFlight();
    expect(isLoginInFlight()).toBe(false);
  });

  it("clears lock on explicit success cleanup", () => {
    setLoginInFlight(true);
    clearLoginInFlight();
    expect(isLoginInFlight()).toBe(false);
  });
});
