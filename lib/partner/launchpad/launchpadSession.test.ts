// FILE: lib/partner/launchpad/launchpadSession.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  issuePartnerConsoleSessionToken,
  resolvePartnerConsoleSession,
  PARTNER_CONSOLE_SESSION_COOKIE,
} from "@/lib/partner/launchpad/partnerConsoleSession";

describe("partner console session", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-session-secret-32chars-min";
  });

  it("issues and resolves HttpOnly session payload without API key material", async () => {
    const token = await issuePartnerConsoleSessionToken({
      partnerId: "acme-retail",
      apiKeyId: "key-uuid",
      environment: "sandbox",
    });
    expect(token).toBeTruthy();

    const req = new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { cookie: `${PARTNER_CONSOLE_SESSION_COOKIE}=${token}` },
    });
    const session = await resolvePartnerConsoleSession(req);
    expect(session?.partnerId).toBe("acme-retail");
    expect(session?.apiKeyId).toBe("key-uuid");
    expect(session?.environment).toBe("sandbox");
  });
});
