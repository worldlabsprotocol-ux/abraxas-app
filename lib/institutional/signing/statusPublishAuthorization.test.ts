import { describe, expect, it } from "vitest";
import { authorizeStatusPublishCallerForRecord } from "./statusPublishAuthorization";
import { createServerRuntimeStatusPublishAuthorization } from "./statusPublishAuthorization.server";

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

  it("allows server runtime authorization from server-only factory", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: createServerRuntimeStatusPublishAuthorization(),
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects partner-scoped publisher without binding", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          resourceScope: "partner",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_status_partner_scope_unbound" });
  });

  it("rejects partner A publishing partner B receipt", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          resourceScope: "partner",
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
          resourceScope: "partner",
          tenantId: "tenant-a",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_tenant_scope_forbidden" });
  });

  it("allows institution-wide publisher across partners", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          resourceScope: "institution_wide",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects institution-wide auth carrying partner fields", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "demo",
          resourceScope: "institution_wide",
          partnerId: "partner-b",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_status_institution_scope_partner_forbidden" });
  });

  it("rejects environment mismatch for worker caller", () => {
    expect(
      authorizeStatusPublishCallerForRecord({
        record,
        authorization: {
          kind: "worker_http_caller",
          environment: "production",
          resourceScope: "partner",
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
          resourceScope: "partner",
          partnerId: "partner-b",
          tenantId: "partner-b",
        },
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: true });
  });
});

describe("recordedWorkflow export boundary", () => {
  it("does not export the server runtime status publish factory", async () => {
    const recordedWorkflow = await import("./recordedWorkflow");
    expect("createServerRuntimeStatusPublishAuthorization" in recordedWorkflow).toBe(false);
    expect("issueServerRuntimeStatusPublishAuthorization" in recordedWorkflow).toBe(false);
  });
});
