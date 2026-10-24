import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("completePartnerFlowAfterApproval return URL handling", () => {
  it("does not re-check partners.allowed_return_urls after route-level authorization", () => {
    const src = readFileSync(resolve(__dirname, "relyingPartyFlow.ts"), "utf8");
    const start = src.indexOf("export async function completePartnerFlowAfterApproval");
    const end = src.indexOf("export async function refreshPartnerSessionReceipt", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);
    expect(body).not.toContain("isReturnUrlAllowed");
  });
});
