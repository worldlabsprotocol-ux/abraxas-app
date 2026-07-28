// FILE: lib/adminAuth.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getAdminEmails, isAdminEmail } from "./adminAuth";

describe("adminAuth", () => {
  const original = process.env.ABRAXAS_ADMIN_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.ABRAXAS_ADMIN_EMAILS;
    else process.env.ABRAXAS_ADMIN_EMAILS = original;
  });

  it("parses admin email allowlist", () => {
    process.env.ABRAXAS_ADMIN_EMAILS = "Admin@Example.com, reviewer@test.io";
    expect(getAdminEmails()).toEqual(["admin@example.com", "reviewer@test.io"]);
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("other@test.io")).toBe(false);
  });

  it("returns false when allowlist empty", () => {
    delete process.env.ABRAXAS_ADMIN_EMAILS;
    expect(isAdminEmail("admin@example.com")).toBe(false);
  });
});
