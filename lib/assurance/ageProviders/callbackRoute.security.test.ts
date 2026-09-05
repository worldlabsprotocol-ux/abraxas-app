// FILE: lib/assurance/ageProviders/callbackRoute.security.test.ts
// Callback routes hard-disabled for placeholders — no query-string approval.

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/age-assurance/callback/[provider]/route";

describe("age-assurance callback security", () => {
  it("rejects placeholder provider GET callback with query-string approval params", async () => {
    const url = new URL(
      "http://localhost/api/age-assurance/callback/digital_wallet_age?state=nonce&provider_session_id=ps1&simulated_age_band=over_21",
    );
    const res = await GET(new NextRequest(url), {
      params: Promise.resolve({ provider: "digital_wallet_age" }),
    });
    expect(res.status).toBe(503);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("provider_not_authoritative");
  });

  it("rejects placeholder provider POST callback with body approval params", async () => {
    const url = new URL("http://localhost/api/age-assurance/callback/verified_email_age");
    const res = await POST(
      new NextRequest(url, {
        method: "POST",
        body: JSON.stringify({
          state: "nonce",
          provider_session_id: "ps1",
          simulated_age_band: "over_21",
        }),
      }),
      { params: Promise.resolve({ provider: "verified_email_age" }) },
    );
    expect(res.status).toBe(503);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("provider_not_authoritative");
  });

  it("rejects unknown provider callbacks", async () => {
    const url = new URL("http://localhost/api/age-assurance/callback/unknown_vendor");
    const res = await GET(new NextRequest(url), {
      params: Promise.resolve({ provider: "unknown_vendor" }),
    });
    expect(res.status).toBe(400);
  });
});
