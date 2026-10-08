import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  attachBrowserSessionCookie,
  BROWSER_SESSION_COOKIE,
  issueBrowserSessionToken,
  requireBrowserSession,
} from "./browserSession";
import { requireAgeAssuranceSession } from "@/lib/assurance/ageProviders/routeHelpers";

afterEach(() => vi.unstubAllEnvs());

describe("hosted holder browser session", () => {
  it("issues a production first-party cookie accepted by qualification and DOB auth guards", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ABRAXAS_BROWSER_SESSION_SECRET", "test-only-holder-session-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const subject = `0x${"a".repeat(64)}`;
    const token = await issueBrowserSessionToken(subject);
    expect(token).toBeTruthy();
    const response = NextResponse.json({ ok: true });
    attachBrowserSessionCookie(response, token!);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${BROWSER_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");

    const request = new NextRequest("https://abraxasworld.xyz/api/age-assurance/self-attest", {
      headers: { cookie: `${BROWSER_SESSION_COOKIE}=${token}` },
    });
    expect(await requireBrowserSession(request)).toEqual({ ok: true, session: { suiAddress: subject } });
    expect(await requireAgeAssuranceSession(request)).toEqual({ ok: true, session: { suiAddress: subject } });
  });

  it("fails closed when the session cookie is missing or invalid", async () => {
    vi.stubEnv("ABRAXAS_BROWSER_SESSION_SECRET", "test-only-holder-session-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const missing = new NextRequest("https://abraxasworld.xyz/api/age-assurance/self-attest");
    const invalid = new NextRequest("https://abraxasworld.xyz/api/age-assurance/self-attest", {
      headers: { cookie: `${BROWSER_SESSION_COOKIE}=invalid` },
    });
    expect((await requireBrowserSession(missing)).ok).toBe(false);
    expect((await requireAgeAssuranceSession(invalid)).ok).toBe(false);
  });
});
