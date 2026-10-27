// FILE: lib/securityOperations/operationalGapAudit.ts
// Build 874 — classify operational security capabilities (no replacement infrastructure).

export type OperationalCapabilityStatus =
  | "implemented"
  | "tested_in_ci"
  | "partially_tested"
  | "operational_dependency"
  | "missing";

export type OperationalSecurityCapability = {
  id: string;
  domain:
    | "signing_rotation"
    | "compromise"
    | "backup_restore"
    | "evidence_outage"
    | "freshness"
    | "revocation"
    | "replay"
    | "tenant_isolation"
    | "monitoring"
    | "recovery";
  capability: string;
  status: OperationalCapabilityStatus;
  reusedComponents: string;
  drillEvidence: string;
  remainingRisk: string;
};

export function auditOperationalSecurityCapabilities(): OperationalSecurityCapability[] {
  return [
    {
      id: "signing_key_rotation_overlap",
      domain: "signing_rotation",
      capability: "Authorized anchor rotation with overlap window",
      status: "tested_in_ci",
      reusedComponents: "lib/partner/integrationKit/trustContinuity/trustContinuity.adversarial.test.ts",
      drillEvidence: "Allows overlap anchor during authorized rotation; rejects compromised rotation signer",
      remainingRisk: "Production rotation runbook execution not automated in repo",
    },
    {
      id: "compromised_anchor_rejection",
      domain: "compromise",
      capability: "Reject rotation signed by wrong anchor key",
      status: "tested_in_ci",
      reusedComponents: "trustContinuity.adversarial.test.ts",
      drillEvidence: "rejects rotation signed by wrong (compromised) anchor key",
      remainingRisk: "Live key compromise simulation requires operator-isolated environment",
    },
    {
      id: "backup_restore_integrity",
      domain: "backup_restore",
      capability: "Encrypted backup restore with digest verification",
      status: "tested_in_ci",
      reusedComponents: "lib/persistence/boundary/sovereignOperationalProof.integration.test.ts",
      drillEvidence: "backup/restore drill; rejects corrupted backup digest",
      remainingRisk: "Not executed against production data (by design)",
    },
    {
      id: "evidence_dependency_outage",
      domain: "evidence_outage",
      capability: "Evidence dependency graph and integrity under adversarial inputs",
      status: "tested_in_ci",
      reusedComponents: "lib/decisionReceipts/evidenceDependencies.graph.test.ts · evidenceDependencyIntegrity.adversarial.test.ts",
      drillEvidence: "Graph + adversarial dependency tests in CI",
      remainingRisk: "Runtime outage failover is operational playbooks, not full chaos test",
    },
    {
      id: "issuer_freshness_non_authorizing",
      domain: "freshness",
      capability: "Stale issuer statement cannot authorize (Build 870)",
      status: "tested_in_ci",
      reusedComponents: "packages/abraxas-independent-verifier issuerFreshnessEnforcement.test.ts · external-node-partner enforce",
      drillEvidence: "statement_stale → deny; never permit",
      remainingRisk: "Deployed status signer clock skew monitoring",
    },
    {
      id: "revocation_preflight",
      domain: "revocation",
      capability: "Pre-issuance revocation gate",
      status: "tested_in_ci",
      reusedComponents: "lib/partner/partnerFlowRevocationRuntime.ts · partner flow integration tests",
      drillEvidence: "Fail closed before receipt side effects",
      remainingRisk: "Cross-region revocation lag not load-tested",
    },
    {
      id: "replay_after_restart",
      domain: "replay",
      capability: "Durable replay rejection (handoff / monotonic status)",
      status: "tested_in_ci",
      reusedComponents: "trustContinuity.adversarial.test.ts · partnerFlowIdempotency.integration.test.ts · walletSovereignTrustPath.adversarial.test.ts",
      drillEvidence: "status_version_rollback_rejected; challenge_already_consumed",
      remainingRisk: "Process restart simulation is in-memory store tests, not full VM restart",
    },
    {
      id: "cross_tenant_isolation",
      domain: "tenant_isolation",
      capability: "Cross-tenant application and policy audience denial",
      status: "tested_in_ci",
      reusedComponents: "lib/decisionReceipts/currentValidity/applicationScopeContract.test.ts · integrationStudioCreate cross-tenant · sovereignOperationalProof cross-tenant policy",
      drillEvidence: "denies cross-tenant application; rejects cross-tenant partner_id on create",
      remainingRisk: "Pen-test style multi-tenant fuzzing not in scope",
    },
    {
      id: "stale_status_replay",
      domain: "revocation",
      capability: "Recovery without reactivating revoked evidence",
      status: "tested_in_ci",
      reusedComponents: "examples/integration-first-relying-party/integration-first.test.ts · signedStatus.adversarial.test.ts",
      drillEvidence: "rejects stale status replay; cross-tenant status reuse rejected",
      remainingRisk: "Live revoked receipt re-acceptance requires Demo drill",
    },
    {
      id: "external_rp_mandatory_deny",
      domain: "freshness",
      capability: "External relying party never permits on mandatory failure codes",
      status: "tested_in_ci",
      reusedComponents: "examples/external-node-partner/externalPartner.test.ts · scripts/build-868/externalRpAdversarial.ts",
      drillEvidence: "Portable RP adversarial matrix + statement_stale enforce test",
      remainingRisk: "Every consumer app must delegate to package enforcement",
    },
    {
      id: "operational_monitoring",
      domain: "monitoring",
      capability: "Partner API usage + metering without PII",
      status: "partially_tested",
      reusedComponents: "lib/partner/partnerMetering.test.ts · logPartnerUsage",
      drillEvidence: "Metering idempotency and privacy tests",
      remainingRisk: "Incident response dashboards and on-call runbooks are operator-owned",
    },
    {
      id: "incident_response_runbook",
      domain: "monitoring",
      capability: "Documented incident / recovery procedures",
      status: "operational_dependency",
      reusedComponents: "docs/operations/* · BUILD_863/BUILD_852",
      drillEvidence: "Not a single automated drill artifact",
      remainingRisk: "Requires external assessment + scheduled operator drills",
    },
  ];
}
