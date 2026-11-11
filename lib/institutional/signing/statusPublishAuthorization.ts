import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export const INTERNAL_TRUSTED_STATUS_PUBLISH = { kind: "internal_trusted" as const };

export type StatusPublishCallerAuthorization = {
  kind: "worker_http_caller";
  environment: "demo" | "production";
  partnerId?: string;
  tenantId?: string;
};

export type StatusPublishAuthorization =
  | StatusPublishCallerAuthorization
  | typeof INTERNAL_TRUSTED_STATUS_PUBLISH;

export function authorizeStatusPublishCallerForRecord(input: {
  record: Pick<DecisionReceiptRecord, "partner_id" | "decision_context">;
  authorization?: StatusPublishAuthorization;
  workerEnvironment: "demo" | "production";
}):
  | { ok: true }
  | { ok: false; reason: "worker_environment_mismatch" | "worker_partner_scope_forbidden" | "worker_tenant_scope_forbidden" } {
  if (!input.authorization || input.authorization.kind === "internal_trusted") {
    return { ok: true };
  }
  const caller = input.authorization;
  if (caller.environment !== input.workerEnvironment) {
    return { ok: false, reason: "worker_environment_mismatch" };
  }
  if (caller.partnerId && caller.partnerId !== input.record.partner_id) {
    return { ok: false, reason: "worker_partner_scope_forbidden" };
  }
  if (caller.tenantId && caller.tenantId !== input.record.decision_context) {
    return { ok: false, reason: "worker_tenant_scope_forbidden" };
  }
  return { ok: true };
}
