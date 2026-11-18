import { describe, expect, it, vi } from "vitest";
import { issuePrepareBindingToken, verifyPrepareBindingToken } from "./prepareBinding";

describe("blockchain-native prepare binding", () => {
  it("rejects tampered portable persistence", () => {
    vi.stubEnv("BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY", "test-secret");
    const persistence = {
      receipt_id: "dr_test",
      public_payload: { payload_hash: "aa".repeat(32), partner_id: "p1", policy_id: "pol1" },
      signature: "sig",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const token = issuePrepareBindingToken({
      application_id: "app-1",
      partner_id: "p1",
      policy_id: "pol1",
      policy_version: 1,
      policy_template_id: "wallet_control",
      scenario_id: "approved",
      holder_wallet: "11111111111111111111111111111112",
      execution_nonce: "1",
      receipt_id: "dr_test",
      payload_hash_hex: "aa".repeat(32),
      persistence,
    });
    expect(token).toBeTruthy();
    const verified = verifyPrepareBindingToken(token!, {
      application_id: "app-1",
      partner_id: "p1",
      holder_wallet: "11111111111111111111111111111112",
      consume: false,
    });
    expect(verified.ok).toBe(true);
    const tampered = JSON.parse(Buffer.from(token!, "base64url").toString("utf8")) as {
      core: unknown;
      persistence: typeof persistence;
      mac: string;
    };
    tampered.persistence.receipt_id = "dr_other";
    const tamperedToken = Buffer.from(JSON.stringify(tampered), "utf8").toString("base64url");
    const failed = verifyPrepareBindingToken(tamperedToken, {
      application_id: "app-1",
      partner_id: "p1",
      holder_wallet: "11111111111111111111111111111112",
    });
    expect(failed).toEqual({ ok: false, code: "prepare_binding_tampered" });
    vi.unstubAllEnvs();
  });
});