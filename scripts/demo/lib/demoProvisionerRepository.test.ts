// FILE: scripts/demo/lib/demoProvisionerRepository.test.ts

import { describe, expect, it } from "vitest";
import {
  assertNoProvisionerConflict,
  loadRecoveryMarkers,
  provisionIdentityBundle,
  type CredentialClaimRow,
  type IdentityVerificationRow,
} from "./demoProvisionerRepository";
import { DemoProvisionerConflictError } from "./demoProvisionerGuard";
import type { ProvisionerPgExecutor } from "./demoProvisionerPgSession";
import { buildManualProvisionerClaims } from "./demoProvisionerClaims";
import { deriveSubjectIdFromProvisionId } from "./demoProvisionerSubject";

function createMockExecutor(state: {
  identities?: IdentityVerificationRow[];
  credentials?: Record<string, unknown>;
  claims?: CredentialClaimRow[];
  queries?: string[];
}): ProvisionerPgExecutor {
  const queries: string[] = state.queries ?? [];

  return {
    async query<T>(sql: string, params: unknown[] = []) {
      queries.push(sql);

      if (sql.includes("FROM public.identity_verifications") && sql.includes("veriff_decision_id")) {
        const provisionId = params[0];
        return {
          rows: (state.identities ?? []).filter(
            (row) => row.veriff_decision_id === provisionId,
          ) as T[],
        };
      }

      if (sql.includes("FROM public.identity_verifications") && sql.includes("wallet_address")) {
        const subjectId = params[0];
        const row = (state.identities ?? []).find(
          (item) => item.wallet_address === subjectId || item.sui_address === subjectId,
        );
        return { rows: row ? [row as T] : [] };
      }

      if (sql.includes("FROM public.abraxas_credentials")) {
        const jti = params[0];
        const row = state.credentials?.[jti as string];
        return { rows: row ? [row as T] : [] };
      }

      if (sql.includes("FROM public.credential_claims") && sql.includes("evidence_reference")) {
        const evidence = params[0] as string;
        return {
          rows: (state.claims ?? []).filter(
            (claim) => claim.evidence_reference === evidence,
          ) as T[],
        };
      }

      if (sql.includes("pg_try_advisory_lock")) {
        return { rows: [{ locked: true }] as T[] };
      }

      return { rows: [] as T[] };
    },
    async tryAdvisoryLock() {
      return true;
    },
    async advisoryUnlock() {
      return undefined;
    },
  };
}

describe("demoProvisionerRepository", () => {
  const provisionId = "44444444-4444-4444-8444-444444444444";
  const subjectId = deriveSubjectIdFromProvisionId(provisionId);

  it("detects conflicting provision markers", () => {
    expect(() =>
      assertNoProvisionerConflict({
        subjectId,
        provisionId,
        identity: {
          wallet_address: subjectId,
          sui_address: subjectId,
          status: "approved",
          identity_verification_status: "approved",
          credential_status: "active",
          credential_jti: `urn:uuid:${provisionId}`,
          veriff_decision_id: "other-provision",
        },
        credential: null,
      }),
    ).toThrow(DemoProvisionerConflictError);
  });

  it("fails recovery when multiple identities match", async () => {
    const tx = createMockExecutor({
      identities: [
        {
          wallet_address: subjectId,
          sui_address: subjectId,
          status: "approved",
          identity_verification_status: "approved",
          credential_status: "active",
          credential_jti: `urn:uuid:${provisionId}`,
          veriff_decision_id: provisionId,
        },
        {
          wallet_address: "0x2",
          sui_address: "0x2",
          status: "approved",
          identity_verification_status: "approved",
          credential_status: "active",
          credential_jti: "urn:uuid:other",
          veriff_decision_id: provisionId,
        },
      ],
    });

    await expect(loadRecoveryMarkers(tx, provisionId)).rejects.toThrow(/Multiple identity/);
  });

  it("rolls back when a later statement fails", async () => {
    const queries: string[] = [];
    let insertCount = 0;
    const tx: ProvisionerPgExecutor = {
      async query(sql: string) {
        queries.push(sql);
        if (sql.includes("RETURNING")) {
          insertCount += 1;
          if (sql.includes("credential_claims") && insertCount > 4) {
            throw new Error("simulated failure");
          }
          if (sql.includes("wallet_address")) return { rows: [{ wallet_address: subjectId }] };
          if (sql.includes("identity_verification_events")) return { rows: [{ id: "evt-1" }] };
          if (sql.includes("abraxas_credentials")) return { rows: [{ jti: `urn:uuid:${provisionId}` }] };
          if (sql.includes("wallet_bindings")) return { rows: [{ subject_id: subjectId }] };
          if (sql.includes("credential_claims")) return { rows: [{ id: `claim-${insertCount}` }] };
          if (sql.includes("audit_events")) return { rows: [{ id: "audit-1" }] };
        }
        return { rows: [] };
      },
      async tryAdvisoryLock() {
        return true;
      },
      async advisoryUnlock() {
        return undefined;
      },
    };

    const now = new Date("2026-01-01T00:00:00.000Z");
    const claims = buildManualProvisionerClaims({
      subjectId,
      jti: `urn:uuid:${provisionId}`,
      provisionId,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      issuedAt: now,
    });

    await expect(
      provisionIdentityBundle(tx, {
        subjectId,
        provisionId,
        jti: `urn:uuid:${provisionId}`,
        issuer: "https://demo.abraxasworld.xyz",
        jurisdiction: "US",
        documentType: "passport",
        jwt: "jwt",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        manualClaims: claims,
        now,
      }),
    ).rejects.toThrow("simulated failure");

    expect(queries.some((sql) => sql.includes("identity_verifications"))).toBe(true);
    expect(queries.some((sql) => sql.includes("credential_claims"))).toBe(true);
  });
});
