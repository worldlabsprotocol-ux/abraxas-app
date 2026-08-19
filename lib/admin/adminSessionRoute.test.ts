// FILE: lib/admin/adminSessionRoute.test.ts

import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";
import { POST } from "@/app/api/admin/session/route";

describe("POST /api/admin/session", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function createSessionRequest(pin: string): NextRequest {
    return new NextRequest("http://localhost/api/admin/session", {
      method: "POST",
      body: JSON.stringify({ pin }),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns 200 and sets the admin session cookie for a valid PIN", async () => {
    vi.stubEnv("ADMIN_PIN", "  presenter-pin  ");
    vi.stubEnv("NODE_ENV", "production");

    const res = await POST(createSessionRequest("presenter-pin"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });

    const expectedToken = createHash("sha256")
      .update("abraxas-admin:presenter-pin")
      .digest("hex");
    const cookie = res.cookies.get(ADMIN_SESSION_COOKIE);
    expect(cookie?.value).toBe(expectedToken);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  it("returns 401 when the submitted PIN does not match", async () => {
    vi.stubEnv("ADMIN_PIN", "configured-pin");
    vi.stubEnv("NODE_ENV", "production");

    const res = await POST(createSessionRequest("wrong-pin"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Invalid admin PIN" });
    expect(res.cookies.get(ADMIN_SESSION_COOKIE)).toBeUndefined();
  });

  it("returns 503 when ADMIN_PIN is not configured", async () => {
    vi.stubEnv("ADMIN_PIN", "");
    vi.stubEnv("NODE_ENV", "production");

    const res = await POST(createSessionRequest("any-pin"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual({ error: "Admin PIN not configured" });
    expect(res.cookies.get(ADMIN_SESSION_COOKIE)).toBeUndefined();
  });
});
