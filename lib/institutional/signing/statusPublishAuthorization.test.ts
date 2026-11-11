import { describe, expect, it } from "vitest";
import {
  authorizeStatusPublishCallerForRecord,
  INTERNAL_TRUSTED_STATUS_PUBLISH,
} from "./statusPublishAuthorization";

describe("status publish caller authorization", () => {
  const record = {
    partner_id: "partner-b",
    decision_context: "tenant-b",
  };

  it("allows internal trusted callers without partner binding", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: INTERNAL_TRUSTED_STATUS_PUBLISH,
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects partner A publishing partner B receipt before signing", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          partnerId: "partner-a",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_partner_scope_forbidden" });
  });

  it("rejects environment mismatch for worker caller", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "production",
          partnerId: "partner-b",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_environment_mismatch" });
  });

  it("allows same-partner worker caller", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          partnerId: "partner-b",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });
});
