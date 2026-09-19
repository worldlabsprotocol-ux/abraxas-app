import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/examples/solana-partner/gate/route";
import { NextRequest } from "next/server";
import { assertNoSensitiveClientKeys } from "@/lib/partner/solana";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/examples/solana-partner/gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("Solana partner reference gate", () => {
  it("allows claim access only for the approved fixture", async () => {
    const res = await post({ fixture: "approved", action: "claim_access" });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ allowed: true, reason: "permitted", action: "claim_access" });
    expect(assertNoSensitiveClientKeys(json)).toEqual([]);
  });

  it("rejects denied expired revoked cross partner altered policy and production sandbox receipts", async () => {
    const cases = [
      ["denied", "policy_denied"],
      ["expired", "receipt_expired"],
      ["revoked", "receipt_revoked"],
      ["cross_partner", "partner_mismatch"],
      ["altered_policy", "policy_mismatch"],
    ] as const;
    for (const [fixture, reason] of cases) {
      const res = await post({ fixture, action: "continue_checkout" });
      const json = await res.json();
      expect(json.allowed).toBe(false);
      expect(json.reason).toBe(reason);
      expect(assertNoSensitiveClientKeys(json)).toEqual([]);
    }
    const sandbox = await post({ fixture: "sandbox_only", environment: "production" });
    const sandboxJson = await sandbox.json();
    expect(sandboxJson).toEqual({ allowed: false, reason: "environment_mismatch", action: "claim_access" });
  });

  it("does not echo receipt material or PII", async () => {
    const res = await post({ fixture: "approved", action: "claim_access" });
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain("receipt_id");
    expect(text.toLowerCase()).not.toContain("dr_solana");
    expect(text.toLowerCase()).not.toContain("signature");
    expect(text.toLowerCase()).not.toContain("wallet");
    expect(text.toLowerCase()).not.toContain("email");
  });
});
