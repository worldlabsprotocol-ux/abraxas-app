// FILE: lib/adminAuth.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { checkAdmin, isAdminPinConfigured } from "./adminAuth";

function reqWithPin(pin?: string) {
  const headers = new Headers();
  if (pin) headers.set("x-admin-pin", pin);
  return new NextRequest("http://localhost/api/admin/test", { headers });
}

describe("adminAuth", () => {
  const env = { ...process.env };

  beforeEach(() => {
    delete process.env.ADMIN_PIN;
    delete process.env.NEXT_PUBLIC_ADMIN_PIN;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("denies when no pin is configured in production", () => {
    process.env.NODE_ENV = "production";
    expect(isAdminPinConfigured()).toBe(false);
    expect(checkAdmin(reqWithPin("anything"))).toBe(false);
  });

  it("accepts server ADMIN_PIN via x-admin-pin header", () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_PIN = "secret-server-pin";
    expect(checkAdmin(reqWithPin("secret-server-pin"))).toBe(true);
    expect(checkAdmin(reqWithPin("wrong"))).toBe(false);
  });

  it("does not accept NEXT_PUBLIC_ADMIN_PIN in production", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ADMIN_PIN = "leaked-public-pin";
    expect(checkAdmin(reqWithPin("leaked-public-pin"))).toBe(false);
  });
});
