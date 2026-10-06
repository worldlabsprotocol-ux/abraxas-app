import { describe, expect, it } from "vitest";
import { buildHostedHandoffContinueDiagnosticPayload } from "./continueContextDiagnostics";

describe("continueContextDiagnostics", () => {
  it("redacts non-opaque refs and keeps safe forensic fields", () => {
    const payload = buildHostedHandoffContinueDiagnosticPayload({
      stage: "continuation_reuse_expired",
      verifyRequestRef: "vr_33a7a87174674ca6",
      handoffRef: "hpf_e8ddf542793178c3",
      continuationJti: "c2cbe8c6-a5a4-40ac-a31f-d728a828cd19",
      errorClass: "Error",
      internalCode: "continuation_expired",
      rawExpiresAt: "2026-10-05 11:59:13.776+00",
      mappedExpiresAt: "2026-10-05T11:59:13.776Z",
      parsedExpiryEpoch: 1791201553776,
      nowEpoch: 1791200700000,
      expired: true,
      consumed: false,
      peekFound: true,
      bindingOk: true,
      dbWriteAttempted: false,
      functionName: "reuseHostedHandoffContinuation",
    });

    expect(payload).toMatchObject({
      type: "abraxas_hosted_handoff_continue_diagnostic",
      stage: "continuation_reuse_expired",
      verify_request_ref: "vr_33a7a87174674ca6",
      handoff_ref: "hpf_e8ddf542793178c3",
      internal_code: "continuation_expired",
      raw_expires_at: "2026-10-05 11:59:13.776+00",
      mapped_expires_at: "2026-10-05T11:59:13.776Z",
      expired: true,
      peek_found: true,
    });
    expect(JSON.stringify(payload)).not.toMatch(/@/);
    expect(JSON.stringify(payload)).not.toMatch(/^0x[a-fA-F0-9]{40}/);
  });
});
