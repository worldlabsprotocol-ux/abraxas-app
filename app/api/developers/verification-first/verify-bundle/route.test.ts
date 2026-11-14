// FILE: app/api/developers/verification-first/verify-bundle/route.test.ts

import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("verify-bundle route", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(new Request("http://local", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_json");
  });

  it("rejects missing bundle", async () => {
    const res = await POST(
      new Request("http://local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_portable_bundle");
  });

  it("rejects bundle without trust anchor", async () => {
    const res = await POST(
      new Request("http://local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle: {
            schema: "abraxas_portable_verification_bundle/1.0.0",
            decision_receipt: { partner_id: "p", policy_id: "pol" },
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("missing_trust_anchor");
  });
});