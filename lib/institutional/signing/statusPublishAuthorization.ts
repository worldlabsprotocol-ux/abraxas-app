import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { StatusPublishResourceScope } from "./worker/workerScopes";

const SERVER_RUNTIME_STATUS_PUBLISH_SEAL = Symbol("abraxas.server_runtime_status_publish");

export type StatusPublishCallerAuthorization = {
  kind: "worker_http_caller";
  environment: "demo" | "production";
  resourceScope: StatusPublishResourceScope;
  partnerId?: string;
  /** When set, must match authoritative `decision_receipts.partner_id` (not `decision_context`). */
  tenantId?: string;
};

export type ServerRuntimeStatusPublishAuthorization = {
  kind: "server_runtime";
  seal: typeof SERVER_RUNTIME_STATUS_PUBLISH_SEAL;
};

export type StatusPublishAuthorization = StatusPublishCallerAuthorization | ServerRuntimeStatusPublishAuthorization;

/** Import only from `statusPublishAuthorization.server.ts` on trusted server execution paths. */
export function issueServerRuntimeStatusPublishAuthorization(): ServerRuntimeStatusPublishAuthorization {
  return { kind: "server_runtime", seal: SERVER_RUNTIME_STATUS_PUBLISH_SEAL };
}

function isServerRuntimeAuthorization(
  authorization: StatusPublishAuthorization,
): authorization is ServerRuntimeStatusPublishAuthorization {
  return authorization.kind === "server_runtime" && authorization.seal === SERVER_RUNTIME_STATUS_PUBLISH_SEAL;
}

export function authorizeStatusPublishCallerForRecord(input: {
  record: Pick<DecisionReceiptRecord, "partner_id">;
  authorization: StatusPublishAuthorization | undefined;
  workerEnvironment: "demo" | "production";
}):
  | { ok: true }
  | {
    ok: false;
    reason:
      | "status_publish_authorization_required"
      | "status_publish_authorization_forbidden"
      | "worker_environment_mismatch"
      | "worker_partner_scope_forbidden"
      | "worker_tenant_scope_forbidden"
      | "worker_status_partner_scope_unbound"
      | "worker_status_institution_scope_partner_forbidden"
      | "worker_status_partner_tenant_mismatch";
  } {
  if (!input.authorization) {
    return { ok: false, reason: "status_publish_authorization_required" };
  }
  if (input.authorization.kind === "server_runtime") {
    if (!isServerRuntimeAuthorization(input.authorization)) {
      return { ok: false, reason: "status_publish_authorization_forbidden" };
    }
    return { ok: true };
  }
  if (input.authorization.kind !== "worker_http_caller") {
    return { ok: false, reason: "status_publish_authorization_forbidden" };
  }
  const caller = input.authorization;
  if (caller.environment !== input.workerEnvironment) {
    return { ok: false, reason: "worker_environment_mismatch" };
  }
  if (caller.resourceScope === "institution_wide") {
    if (caller.partnerId || caller.tenantId) {
      return { ok: false, reason: "worker_status_institution_scope_partner_forbidden" };
    }
    return { ok: true };
  }
  const boundPartner = caller.partnerId ?? caller.tenantId;
  if (!boundPartner) {
    return { ok: false, reason: "worker_status_partner_scope_unbound" };
  }
  if (caller.partnerId && caller.tenantId && caller.partnerId !== caller.tenantId) {
    return { ok: false, reason: "worker_status_partner_tenant_mismatch" };
  }
  if (caller.partnerId && caller.partnerId !== input.record.partner_id) {
    return { ok: false, reason: "worker_partner_scope_forbidden" };
  }
  if (caller.tenantId && caller.tenantId !== input.record.partner_id) {
    return { ok: false, reason: "worker_tenant_scope_forbidden" };
  }
  return { ok: true };
}
