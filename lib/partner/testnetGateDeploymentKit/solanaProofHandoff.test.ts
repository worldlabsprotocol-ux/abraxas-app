import { describe, expect, it } from "vitest";
import { resolveInstitutionalReceiptInput } from "./solanaProofHandoff";

const APP = "b8c7b4fd-d2cb-4178-aece-f274f7b3bc0c";
const KEY = "abx_test_private";
const REF = "hpf_0123456789abcdef";
const completed = {
  ok: true,
  application_id: APP,
  environment: "sandbox",
  action: "activate_protocol_access",
  policy_version: 1,
  status: "completed",
  public_receipt_id: "dr_current_receipt",
};

function reply(data: Record<string, unknown>) {
  return async () => new Response(JSON.stringify(data), { status: 200 });
}

describe("Solana proof handoff receipt lookup", () => {
  it("accepts a direct receipt without a network request", async () => {
    const result = await resolveInstitutionalReceiptInput("dr_current_receipt", APP, KEY, async () => {
      throw new Error("should not fetch");
    });
    expect(result).toEqual({ ok: true, receiptId: "dr_current_receipt" });
  });

  it("resolves a completed handoff with an authenticated partner request", async () => {
    let authorization = "";
    const result = await resolveInstitutionalReceiptInput(REF, APP, KEY, async (url, init) => {
      expect(url).toContain(REF);
      authorization = String((init.headers as Record<string, string>).authorization);
      return new Response(JSON.stringify(completed), { status: 200 });
    });
    expect(authorization).toBe(`Bearer ${KEY}`);
    expect(result).toEqual({ ok: true, receiptId: "dr_current_receipt" });
  });

  it("does not issue from an incomplete handoff or a different application", async () => {
    expect(await resolveInstitutionalReceiptInput(REF, APP, KEY, reply({ ...completed, status: "created" })))
      .toEqual({ ok: false, reason: "handoff_not_completed" });
    expect(await resolveInstitutionalReceiptInput(REF, APP, KEY, reply({ ...completed, application_id: "other-app" })))
      .toEqual({ ok: false, reason: "handoff_binding_mismatch" });
  });

  it("rejects missing receipts and malformed references", async () => {
    expect(await resolveInstitutionalReceiptInput(REF, APP, KEY, reply({ ...completed, public_receipt_id: null })))
      .toEqual({ ok: false, reason: "handoff_receipt_unavailable" });
    expect(await resolveInstitutionalReceiptInput("b8c7b4fd-d2cb-4178-aece-f274f7b3bc0c", APP, KEY, reply(completed)))
      .toEqual({ ok: false, reason: "invalid_receipt_or_handoff_ref" });
  });
});
