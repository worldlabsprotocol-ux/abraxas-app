// FILE: lib/partner/universalIntegration/integrationAdoptionSecurityAudit.ts
// Static adoption/security readiness — distinguishes tested vs documented controls (Build 873).

export type IntegrationSecurityControl = {
  id: string;
  domain: "signing" | "session" | "replay" | "revocation" | "evidence" | "monitoring" | "recovery";
  control: string;
  status: "tested_in_ci" | "implemented_unverified" | "operational_dependency" | "gap";
  evidence: string;
};

export function auditIntegrationAdoptionSecurityControls(): IntegrationSecurityControl[] {
  return [
    {
      id: "freshness_mandatory_deny",
      domain: "signing",
      control: "Issuer statement freshness mandatory deny (Build 870)",
      status: "tested_in_ci",
      evidence: "packages/abraxas-independent-verifier issuerFreshnessEnforcement.test.ts · enforceIndependent",
    },
    {
      id: "portable_enforcement_no_permit_on_stale",
      domain: "signing",
      control: "External partner enforce.ts delegates to package enforcement",
      status: "tested_in_ci",
      evidence: "examples/external-node-partner/externalPartner.test.ts",
    },
    {
      id: "api_key_server_only",
      domain: "session",
      control: "Sandbox API keys not embedded in Studio snippets",
      status: "tested_in_ci",
      evidence: "lib/partner/integrationStudio/safety studioPayloadLeaks",
    },
    {
      id: "partner_api_metering_dedup",
      domain: "monitoring",
      control: "Partner API metering idempotency",
      status: "tested_in_ci",
      evidence: "lib/partner/partnerMetering.test.ts",
    },
    {
      id: "replay_protection_handoff",
      domain: "replay",
      control: "Hosted handoff ref resolution + receipt id binding",
      status: "implemented_unverified",
      evidence: "Partner handoff routes · requires live sandbox adversarial run",
    },
    {
      id: "key_rotation_runbook",
      domain: "recovery",
      control: "Verification key rotation procedure",
      status: "operational_dependency",
      evidence: "docs/operations receipt verification key lifecycle · operator execution",
    },
    {
      id: "backup_restore_drill",
      domain: "recovery",
      control: "Backup restoration drill evidence",
      status: "operational_dependency",
      evidence: "Build 852/863 ops docs · not automated in this repo",
    },
    {
      id: "cross_tenant_isolation",
      domain: "session",
      control: "Tenant isolation on partner APIs",
      status: "tested_in_ci",
      evidence: "lib/partner/sandboxPartnerContract · partner auth tests",
    },
    {
      id: "revocation_preflight",
      domain: "revocation",
      control: "Pre-issuance revocation gate",
      status: "tested_in_ci",
      evidence: "lib/partner/partnerFlowRevocationRuntime.ts · partner flow tests",
    },
    {
      id: "evidence_dependency_graph",
      domain: "evidence",
      control: "Evidence dependency availability checks",
      status: "tested_in_ci",
      evidence: "lib/decisionReceipts/evidenceDependencies.graph.test.ts",
    },
  ];
}
