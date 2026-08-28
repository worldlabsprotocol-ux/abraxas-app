// FILE: scripts/demo/lib/demoServiceRolePrivilegeExpectations.ts
// Runtime-derived service_role table privilege expectations for catalog validation.

import { DEMO_REQUIRED_TABLES } from "./demoMigrationManifest";

export type TablePrivilege =
  | "SELECT"
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "TRUNCATE"
  | "REFERENCES"
  | "TRIGGER";

export const FORBIDDEN_SERVICE_ROLE_PRIVILEGES = [
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
] as const satisfies readonly TablePrivilege[];

export interface ServiceRolePrivilegeExpectation {
  table: string;
  privileges: readonly Exclude<
    TablePrivilege,
    (typeof FORBIDDEN_SERVICE_ROLE_PRIVILEGES)[number]
  >[];
  /** Library call sites supporting the expectation (no SQL). */
  evidence: readonly string[];
}

/**
 * Expected service_role privileges for Partner Sandbox demo runtime.
 * UPSERT paths require INSERT + UPDATE. No DELETE/TRUNCATE inferred without call sites.
 */
export const DEMO_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS: readonly ServiceRolePrivilegeExpectation[] = [
  {
    table: "identity_verifications",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/partner/relyingPartyFlow.ts#getHolderCredentialStatus",
      "lib/idv/identityVerificationDb.ts#upsert",
      "app/api/idv/sync-decision/route.ts#update",
    ],
  },
  {
    table: "abraxas_credentials",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/partner/relyingPartyFlow.ts#getHolderCredentialStatus",
      "lib/idv/issueIdentityCredential.ts#upsert",
      "lib/credentials/claimsService.ts#revokeSubjectClaims",
    ],
  },
  {
    table: "credential_claims",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/credentials/claimsService.ts#getActiveClaims",
      "lib/credentials/claimsService.ts#upsertClaims",
      "lib/credentials/claimsService.ts#revokeSubjectClaims",
    ],
  },
  {
    table: "wallet_bindings",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/walletAuthority/service.ts#upsert",
      "lib/decisionReceipts/service.ts#select",
      "lib/credentials/claimsService.ts#upsertWalletBinding",
    ],
  },
  {
    table: "partner_policies",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/policy/getPolicy.ts#select",
      "lib/policy/policyVersioning.ts#createInitialPolicyDraft",
      "lib/policy/policyVersioning.ts#updatePolicyDraft",
    ],
  },
  {
    table: "partners",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/connect/returnUrlAllowlist.ts#select",
      "lib/partner/promoteDesignPartner.ts#upsert",
      "lib/partner/webhooks/webhookConfigService.ts#select",
    ],
  },
  {
    table: "verification_requests",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/verification/requestsService.ts#insert",
      "lib/verification/requestsService.ts#update",
      "lib/connect/authorizationService.ts#update",
    ],
  },
  {
    table: "verification_decisions",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/partner/relyingPartyFlow.ts#insert",
      "lib/partner/sessionDecision.ts#update",
      "lib/verification/requestsService.ts#insert",
    ],
  },
  {
    table: "consent_receipts",
    privileges: ["SELECT", "INSERT"],
    evidence: [
      "lib/verification/requestsService.ts#insert",
      "lib/decisionReceipts/service.ts#select",
      "lib/connect/authorizationService.ts#insert",
    ],
  },
  {
    table: "audit_events",
    privileges: ["INSERT", "SELECT"],
    evidence: [
      "lib/verification/audit.ts#appendAuditEvent",
      "lib/decisionReceipts/service.ts#getReceiptAuditTimeline",
    ],
  },
  {
    table: "credential_issuers",
    privileges: ["SELECT"],
    evidence: [
      "lib/trust/issuerFramework.ts#select",
      "lib/trust/trustRegistry.ts#select",
    ],
  },
  {
    table: "decision_receipts",
    privileges: ["SELECT", "INSERT"],
    evidence: [
      "lib/decisionReceipts/service.ts#insert",
      "lib/decisionReceipts/service.ts#getReceiptById",
    ],
  },
  {
    table: "credential_status_events",
    privileges: ["SELECT", "INSERT"],
    evidence: ["lib/trust/credentialStatusRegistry.ts#insert"],
  },
  {
    table: "receipt_claim_dependencies",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: [
      "lib/decisionReceipts/dependencies.ts#upsert",
      "lib/trust/credentialStatusRegistry.ts#select",
    ],
  },
  {
    table: "partner_metering_events",
    privileges: ["SELECT", "INSERT"],
    evidence: [
      "lib/partner/partnerMetering.ts#insert",
      "lib/partner/partnerMeteringReport.ts#select",
    ],
  },
  {
    table: "partner_entitlements",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["lib/partner/partnerEntitlements.ts#upsert"],
  },
  {
    table: "partner_webhook_configs",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["lib/partner/webhooks/webhookConfigService.ts"],
  },
  {
    table: "partner_webhook_outbox",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["lib/partner/webhooks/webhookOutbox.ts"],
  },
  {
    table: "partner_webhook_delivery_attempts",
    privileges: ["SELECT", "INSERT"],
    evidence: ["lib/partner/webhooks/webhookDelivery.ts#insert"],
  },
] as const;

/** Adjacent tables used by Phase 1 sandbox-demo routes (audited call-site scope). */
export const DEMO_ADJACENT_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS: readonly ServiceRolePrivilegeExpectation[] = [
  {
    table: "partner_api_keys",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["lib/partner/partnerAuth.ts", "lib/partner/promoteDesignPartner.ts"],
  },
  {
    table: "partner_api_usage",
    privileges: ["SELECT", "INSERT"],
    evidence: ["lib/partner/logPartnerUsage.ts#insert"],
  },
  {
    table: "wallet_binding_challenges",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["lib/walletAuthority/service.ts", "lib/walletBinding/suiChallenge.ts"],
  },
  {
    table: "connect_authorization_requests",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["lib/connect/authorizationService.ts"],
  },
  {
    table: "sui_zklogin_identities",
    privileges: ["SELECT", "INSERT", "UPDATE"],
    evidence: ["app/api/auth/zklogin/register/route.ts#upsert"],
  },
] as const;

/** Full audited runtime matrix: 19 required tables + 5 adjacent runtime tables. */
export const DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS: readonly ServiceRolePrivilegeExpectation[] = [
  ...DEMO_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  ...DEMO_ADJACENT_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
] as const;

export const DEMO_SERVICE_ROLE_GRANT_TABLES = DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.map(
  (entry) => entry.table,
) as readonly string[];

/**
 * Migration 065 historical grants that differ from the current post-073 effective posture.
 * Migration 065 granted INSERT only on audit_events; migration 073 adds temporary SELECT.
 */
export const DEMO_MIGRATION_065_PRIVILEGE_OVERRIDES: Readonly<
  Partial<Record<string, readonly Exclude<TablePrivilege, (typeof FORBIDDEN_SERVICE_ROLE_PRIVILEGES)[number]>[]>>
> = {
  audit_events: ["INSERT"],
};

export function getMigration065TablePrivileges(
  entry: ServiceRolePrivilegeExpectation,
): readonly Exclude<TablePrivilege, (typeof FORBIDDEN_SERVICE_ROLE_PRIVILEGES)[number]>[] {
  return DEMO_MIGRATION_065_PRIVILEGE_OVERRIDES[entry.table] ?? entry.privileges;
}

export function buildMigration065PrivilegeMatrixSqlValues(): string {
  const rows: string[] = [];
  for (const entry of DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS) {
    for (const privilege of getMigration065TablePrivileges(entry)) {
      rows.push(`  ('${entry.table}', '${privilege}')`);
    }
  }
  return rows.join(",\n");
}

export function assertRequiredTablesCoveredByPrivilegeMatrix(): void {
  for (const table of DEMO_REQUIRED_TABLES) {
    if (!DEMO_SERVICE_ROLE_GRANT_TABLES.includes(table)) {
      throw new Error(`Required table missing from service_role privilege matrix: ${table}`);
    }
  }
}

export function buildServiceRolePrivilegeMatrixSqlValues(): string {
  const rows: string[] = [];
  for (const entry of DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS) {
    for (const privilege of entry.privileges) {
      rows.push(`  ('${entry.table}', '${privilege}')`);
    }
  }
  return rows.join(",\n");
}

export function renderServiceRolePrivilegeMatrix(): string {
  return DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.map((entry) =>
    `${entry.table}: ${entry.privileges.join(", ")}`,
  ).join("\n");
}

/** Hardcoded GRANT literals expected inside 065_service_role_runtime_grants.sql. */
export function buildExpected065GrantLiterals(): readonly string[] {
  const grants: string[] = ["GRANT USAGE ON SCHEMA public TO service_role;"];
  for (const entry of DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS) {
    const privileges = getMigration065TablePrivileges(entry);
    grants.push(
      `GRANT ${privileges.join(", ")} ON TABLE public.${entry.table} TO service_role;`,
    );
  }
  return grants;
}
