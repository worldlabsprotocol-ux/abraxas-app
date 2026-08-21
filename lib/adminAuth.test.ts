// FILE: lib/adminAuth.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";

const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => {
    const chain: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      maybeSingle: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: maybeSingleMock,
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.limit.mockResolvedValue({ data: [], error: null });
    return { from: vi.fn(() => chain) };
  }),
}));

import {
  checkAdmin,
  checkProductionSensitiveAdminAccess,
  getAdminEmails,
  getConfiguredAdminPin,
  isAdminEmail,
  normalizeSubmittedAdminPin,
  resolveStrictProductionAdminAccess,
} from "./adminAuth";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

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

describe("strict production admin access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBrowserSessionMock.mockResolvedValue(null);
    maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" } });
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
    vi.stubEnv("ADMIN_PIN", "test-admin-pin");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects PIN-only requests on Production origin", async () => {
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { "x-admin-pin": "test-admin-pin" },
    });
    expect(await checkProductionSensitiveAdminAccess(req)).toBe(false);
    expect(await resolveStrictProductionAdminAccess(req)).toMatchObject({
      authorized: false,
      reason: "no_session",
    });
  });

  it("authorizes allowlisted browser session on Production origin", async () => {
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    expect(await checkProductionSensitiveAdminAccess(req)).toBe(true);
    expect(await resolveStrictProductionAdminAccess(req)).toMatchObject({
      authorized: true,
      method: "email",
      reason: "email_allowlisted",
      email: "ops@example.com",
    });
  });

  it("authorizes allowlisted session when x-admin-pin is also present", async () => {
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: {
        cookie: "abraxas_browser_session=test-token",
        "x-admin-pin": "test-admin-pin",
      },
    });
    expect(await checkProductionSensitiveAdminAccess(req)).toBe(true);
  });

  it("rejects non-allowlisted browser session on Production origin", async () => {
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    maybeSingleMock.mockResolvedValue({ data: { email: "other@example.com" } });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    expect(await checkProductionSensitiveAdminAccess(req)).toBe(false);
    expect(await resolveStrictProductionAdminAccess(req)).toMatchObject({
      authorized: false,
      reason: "email_not_allowlisted",
    });
  });

  it("fails closed when allowlist is empty on Production origin", async () => {
    vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "");
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    expect(await checkProductionSensitiveAdminAccess(req)).toBe(false);
    expect(await resolveStrictProductionAdminAccess(req)).toMatchObject({
      authorized: false,
      reason: "allowlist_empty",
    });
  });

  it("preserves localhost development PIN behavior", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("ABRAXAS_ISSUER_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { "x-admin-pin": "test-admin-pin" },
    });
    expect(await checkProductionSensitiveAdminAccess(req)).toBe(true);
  });
});
