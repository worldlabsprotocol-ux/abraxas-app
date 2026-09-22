import { SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS, SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL } from "./contract";
import { organizationLeaks } from "@/lib/organizationEligibility/safety";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";

export interface OperatorSandboxInstitutionalAuditItem {
  organization_ref: string;
  operator_action_class: typeof SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS;
  result_label: typeof SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL;
  policy_id: typeof SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
  policy_version: typeof SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION;
  environment: "sandbox";
  expires_at: string;
  lifecycle_state: string;
  application_ref: string;
  live_kyb: false;
}

const audit = new Map<string, OperatorSandboxInstitutionalAuditItem>();

export function resetOperatorSandboxInstitutionalAuditForTests(): void {
  audit.clear();
}

export function recordOperatorSandboxInstitutionalAudit(item: OperatorSandboxInstitutionalAuditItem): void {
  if (organizationLeaks(item).length) {
    throw Object.assign(new Error("redacted"), { code: "redacted" });
  }
  audit.set(item.organization_ref, item);
}

export function listOperatorSandboxInstitutionalAudit(applicationRef?: string): OperatorSandboxInstitutionalAuditItem[] {
  const rows: OperatorSandboxInstitutionalAuditItem[] = [];
  audit.forEach((item) => {
    if (!applicationRef || item.application_ref === applicationRef) rows.push(item);
  });
  return rows.sort((a, b) => b.expires_at.localeCompare(a.expires_at));
}

export function loadOperatorSandboxInstitutionalAudit(ref: string): OperatorSandboxInstitutionalAuditItem | null {
  return audit.get(ref) ?? null;
}

export function isOperatorSandboxTestResult(record: { purpose?: string }): boolean {
  return record.purpose === SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL;
}
