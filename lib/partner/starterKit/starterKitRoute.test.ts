// FILE: lib/partner/starterKit/starterKitRoute.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { GET, POST } from "@/app/api/developers/integration-studio/starter-kit/route";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";

function post(body: unknown) {
  return POST(new NextRequest("http://localhost/api/developers/integration-studio/starter-kit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("starter kit route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
  });

  it("returns a public catalog without credentials", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.issues_credentials).toBe(false);
    expect(json.moves_funds).toBe(false);
    expect(json.browser_only_supported).toBe(false);
    expect(json.runtimes).toContain("javascript_wix_velo");
    expect(json.runtimes).toContain("universal_https");
    expect(studioPayloadLeaks(json)).toEqual([]);
  });

  it("generates a safe kit and rejects circle or unknown packs", async () => {
    const ok = await post({
      pack_id: "age_21_retail",
      path: "server_receipt_verify",
      runtime: "typescript_nextjs",
      capabilities: [],
    });
    expect(ok.status).toBe(200);
    const kit = await ok.json();
    expect(kit.ok).toBe(true);
    expect(kit.files.some((file: { path: string }) => file.path.includes("callback"))).toBe(true);
    expect(kit.filename).toMatch(/\.zip$/);
    expect(studioPayloadLeaks({ ...kit, archive_base64: "" })).toEqual([]);

    const denied = await post({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "typescript_nextjs",
      capabilities: ["circle_settlement"],
    });
    expect(denied.status).toBe(400);
    expect((await denied.json()).error).toBe("capability_rejected");
  });
});
