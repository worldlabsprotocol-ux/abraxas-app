// FILE: lib/security/auditGateStatus.ts
// Live audit gate telemetry for mainnet readiness.

import { AUDIT_TRACKER } from "@/lib/securityProgram";

export function getAuditGateStatus() {
  const passportAudit = AUDIT_TRACKER.find(a => a.id === "sui-passport");
  const credentialAudit = AUDIT_TRACKER.find(a => a.id === "credential-api");

  return {
    passportMainnetAuditComplete: passportAudit?.status === "complete",
    credentialApiReviewComplete: credentialAudit?.status === "complete",
    passportAuditStatus: passportAudit?.status ?? "planned",
    credentialAuditStatus: credentialAudit?.status ?? "planned",
  };
}
