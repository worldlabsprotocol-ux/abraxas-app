// FILE: lib/adminAuth.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  checkAdmin,
  getAdminEmails,
  getConfiguredAdminPin,
  isAdminEmail,
  normalizeSubmittedAdminPin,
} from "./adminAuth";

describe("adminAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses admin email allowlist", () => {
    vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "Admin@Example.com, reviewer@test.io");
    expect(getAdminEmails()).toEqual(["admin@example.com", "reviewer@test.io"]);
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("other@test.io")).toBe(false);
  });

  it("returns false when allowlist empty", () => {
    vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "");
    expect(isAdminEmail("admin@example.com")).toBe(false);
  });

  it("trims configured and submitted PIN values before comparison", () => {
    vi.stubEnv("ADMIN_PIN", "  demo-pin  ");
    vi.stubEnv("NODE_ENV", "production");

    expect(getConfiguredAdminPin()).toBe("demo-pin");
    expect(normalizeSubmittedAdminPin(" demo-pin ")).toBe("demo-pin");

    const req = new NextRequest("http://localhost/api/admin/session", {
      headers: { "x-admin-pin": " demo-pin " },
    });
    expect(checkAdmin(req)).toBe(true);
  });
});
