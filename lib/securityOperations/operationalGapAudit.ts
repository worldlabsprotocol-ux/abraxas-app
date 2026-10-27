// FILE: lib/securityOperations/operationalGapAudit.ts
// Build 874 — classify operational security capabilities (no replacement infrastructure).

export type OperationalCapabilityStatus =
  | "implemented"
  | "tested_in_ci"
  | "partially_tested"
  | "operational_dependency"
  | "missing";

/** Distinguishes CI simulation from deployed operational proof (Build 874 acceptance). */
export type OperationalEvidenceTier = "simulated_ci" | "deployed_demo" | "requires_operator";

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
  evidenceTier: OperationalEvidenceTier;
  reusedComponents: string;
  drillEvidence: string;
  remainingRisk: string;
  /** Build 874 acceptance priority (1 = highest); null = supporting control */
  acceptancePriority: 1 | 2 | 3 | 4 | 5 | 6 | null;
};

export const BUILD874_ACCEPTANCE_PRIORITY_ORDER = [
  "replay_after_restart",
  "signing_key_rotation_overlap",
  "compromised_anchor_rejection",
  "evidence_dependency_outage",
  "backup_restore_integrity",
  "stale_status_replay",
  "cross_tenant_isolation",
] as const;

export function summarizeOperationalEvidenceTiers(
  capabilities: OperationalSecurityCapability[] = auditOperationalSecurityCapabilities(),
): Record<OperationalEvidenceTier, number> {
  const counts: Record<OperationalEvidenceTier, number> = {
    simulated_ci: 0,
    deployed_demo: 0,
    requires_operator: 0,
  };
  for (const cap of capabilities) {
    counts[cap.evidenceTier] += 1;
  }
  return counts;
}

export function auditOperationalSecurityCapabilities(): OperationalSecurityCapability[] {
  return [
    {
      id: "signing_key_rotation_overlap",
      domain: "signing_rotation",
      capability: "Authorized anchor rotation with overlap window",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 2,
      reusedComponents: "lib/partner/integrationKit/trustContinuity/trustContinuity.adversarial.test.ts",
      drillEvidence: "Allows overlap anchor during authorized rotation; rejects compromised rotation signer",
      remainingRisk: "Production rotation runbook execution not automated in repo",
    },
    {
      id: "compromised_anchor_rejection",
      domain: "compromise",
      capability: "Reject rotation signed by wrong anchor key",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 2,
      reusedComponents: "trustContinuity.adversarial.test.ts",
      drillEvidence: "rejects rotation signed by wrong (compromised) anchor key",
      remainingRisk: "Live key compromise simulation requires operator-isolated staging",
    },
    {
      id: "backup_restore_integrity",
      domain: "backup_restore",
      capability: "Encrypted backup restore with digest verification",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 4,
      reusedComponents: "lib/persistence/boundary/sovereignOperationalProof.integration.test.ts",
      drillEvidence: "backup/restore drill; rejects corrupted backup digest",
      remainingRisk: "Not executed against production data or live encrypted backup store (by design)",
    },
    {
      id: "evidence_dependency_outage",
      domain: "evidence_outage",
      capability: "Evidence dependency graph and integrity under adversarial inputs",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 3,
      reusedComponents: "lib/decisionReceipts/evidenceDependencies.graph.test.ts · evidenceDependencyIntegrity.adversarial.test.ts",
      drillEvidence: "Graph + adversarial dependency tests in CI",
      remainingRisk: "Runtime evidence store outage + recovery requires deployed failure injection",
    },
    {
      id: "issuer_freshness_non_authorizing",
      domain: "freshness",
      capability: "Stale issuer statement cannot authorize (Build 870)",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: null,
      reusedComponents: "packages/abraxas-independent-verifier issuerFreshnessEnforcement.test.ts · external-node-partner enforce",
      drillEvidence: "statement_stale → deny; never permit",
      remainingRisk: "Deployed status signer clock skew monitoring",
    },
    {
      id: "revocation_preflight",
      domain: "revocation",
      capability: "Pre-issuance revocation gate",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: null,
      reusedComponents: "lib/partner/partnerFlowRevocationRuntime.ts · partner flow integration tests",
      drillEvidence: "Fail closed before receipt side effects",
      remainingRisk: "Cross-region revocation lag not load-tested",
    },
    {
      id: "replay_after_restart",
      domain: "replay",
      capability: "Durable replay rejection (handoff / monotonic status)",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 1,
      reusedComponents: "trustContinuity.adversarial.test.ts · walletSovereignTrustPath.adversarial.test.ts",
      drillEvidence: "status_version_rollback_rejected; challenge_already_consumed",
      remainingRisk: "Process restart simulation is in-memory store tests, not full infrastructure restart",
    },
    {
      id: "cross_tenant_isolation",
      domain: "tenant_isolation",
      capability: "Cross-tenant application and policy audience denial",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 6,
      reusedComponents: "lib/decisionReceipts/currentValidity/applicationScopeContract.test.ts · integrationStudioCreate cross-tenant · sovereignOperationalProof cross-tenant policy",
      drillEvidence: "denies cross-tenant application; rejects cross-tenant partner_id on create",
      remainingRisk: "Authorization failure fuzzing under live Demo load not demonstrated",
    },
    {
      id: "stale_status_replay",
      domain: "revocation",
      capability: "Recovery without reactivating revoked evidence",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: 5,
      reusedComponents: "examples/integration-first-relying-party/integration-first.test.ts · signedStatus.adversarial.test.ts",
      drillEvidence: "rejects stale status replay; cross-tenant status reuse rejected",
      remainingRisk: "Revocation persistence through live backup/restore cycle unproven on deployed infra",
    },
    {
      id: "external_rp_mandatory_deny",
      domain: "freshness",
      capability: "External relying party never permits on mandatory failure codes",
      status: "tested_in_ci",
      evidenceTier: "simulated_ci",
      acceptancePriority: null,
      reusedComponents: "examples/external-node-partner/externalPartner.test.ts · portable-relying-party.test.ts",
      drillEvidence: "Portable RP adversarial matrix + statement_stale enforce test",
      remainingRisk: "Every consumer app must delegate to package enforcement",
    },
    {
      id: "operational_monitoring",
      domain: "monitoring",
      capability: "Partner API usage + metering without PII",
      status: "partially_tested",
      evidenceTier: "simulated_ci",
      acceptancePriority: null,
      reusedComponents: "lib/partner/partnerMetering.test.ts · logPartnerUsage",
      drillEvidence: "Metering idempotency and privacy tests",
      remainingRisk: "Incident response dashboards and on-call runbooks are operator-owned",
    },
    {
      id: "incident_response_runbook",
      domain: "monitoring",
      capability: "Documented incident / recovery procedures",
      status: "operational_dependency",
      evidenceTier: "requires_operator",
      acceptancePriority: null,
      reusedComponents: "docs/operations/* · BUILD_863/BUILD_852",
      drillEvidence: "Not a single automated drill artifact",
      remainingRisk: "Requires external assessment + scheduled operator drills",
    },
  ];
}
