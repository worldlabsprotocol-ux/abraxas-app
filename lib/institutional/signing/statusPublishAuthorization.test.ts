import { describe, expect, it } from "vitest";
import {
  authorizeStatusPublishCallerForRecord,
  createServerRuntimeStatusPublishAuthorization,
} from "./statusPublishAuthorization";

describe("status publish caller authorization", () => {
  const record = {
    partner_id: "partner-b",
  };

  it("rejects omitted authorization", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: undefined,
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "status_publish_authorization_required" });
  });

  it("rejects forged internal_trusted shape", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: { kind: "internal_trusted" } as never,
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "status_publish_authorization_forbidden" });
  });

  it("rejects forged server_runtime without seal", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: { kind: "server_runtime" } as never,
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "status_publish_authorization_forbidden" });
  });

  it("allows unforgeable server runtime authorization", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: createServerRuntimeStatusPublishAuthorization(),
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects partner A publishing partner B receipt", () => {
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

  it("rejects tenant scope mismatch against authoritative partner_id", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          tenantId: "tenant-a",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_tenant_scope_forbidden" });
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
          tenantId: "partner-b",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });
});
