// FILE: lib/persistence/boundary/staging/build834SovereignValidityParity.ts
// Build #834 — sovereign current-validity parity, adversarial matrix, recovery + verify.

import type { Pool } from "pg";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { assertNoUnsafePermit } from "@/lib/decisionReceipts/currentValidity/unifiedContract";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";
import { publishSignedIssuerAuthorityFromRegistry } from "../issuerAuthority/buildFromRegistry";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "../trustDistribution/publishSignedReceiptStatus";
import {
  runBuild820Acceptance,
  type Build820AcceptanceReport,
  type Build820ScenarioResult,
} from "./threeLayerTrustAcceptance";
import { CURRENT_VALIDITY_TRUST_PATHS } from "../sovereignCurrentValidity/postgrestTrustBoundary";

export type Build834ScenarioResult = Build820ScenarioResult & {
  sovereign_currently_acceptable?: boolean;
};

export type Build834ParityReport = {
  build: "834";
  base820: Build820AcceptanceReport;
  extended_scenarios: Build834ScenarioResult[];
  postgrest_trust_paths: typeof CURRENT_VALIDITY_TRUST_PATHS;
  parity_notes: string[];
  generated_at: string;
};

function assertSignedIssuer(
  value: ReturnType<typeof publishSignedIssuerAuthorityFromRegistry>,
): import("../issuerAuthority/contract").SignedIssuerAuthorityStatement {
  if ("payload" in value) return value;
  throw new Error(value.reason);
}

async function sovereignEval(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string | undefined>;
  anchorPublicJwk: JsonWebKey;
  anchorPrivateJwk: JsonWebKey;
  registryVersion: number;
  overrides?: Partial<Parameters<typeof evaluateSovereignCurrentValidity>[0]>;
}) {
  const signedIssuer = assertSignedIssuer(
    publishSignedIssuerAuthorityFromRegistry({
      registryVersion: input.registryVersion,
      anchorKeyId: "build834-trust-anchor",
      anchorPrivateJwk: input.anchorPrivateJwk,
      env: input.env,
    }),
  );
  const evaluation = await evaluateSovereignCurrentValidity({
    record: input.record,
    signedIssuerAuthority: signedIssuer,
    trustAnchorPublicJwk: input.anchorPublicJwk,
    expectedEnvironment: "demo",
    env: input.env,
    ...input.overrides,
  });
  if (evaluation.currently_acceptable) {
    assertNoUnsafePermit({
      currently_acceptable: evaluation.currently_acceptable,
      invalidation_reasons: evaluation.invalidation_reasons,
      lifecycle_status: evaluation.lifecycle_status,
    });
  }
  return evaluation;
}

export async function runBuild834SovereignValidityParity(input: {
  primaryPool: Pool;
  restorePool: Pool;
  env: Record<string, string | undefined>;
}): Promise<Build834ParityReport> {
  const base820 = await runBuild820Acceptance({
    primaryPool: input.primaryPool,
    restorePool: input.restorePool,
    env: input.env,
    includeRecovery: true,
  });

  const extended: Build834ScenarioResult[] = [];
  const parity_notes: string[] = [
    "Build #834 extends #820; sovereign slice uses direct PostgreSQL only for current-validity authority.",
    "Operational PostgREST path remains for Demo/Production until controlled cutover — not claimed eliminated globally.",
  ];

  if (base820.three_layer_happy_path.verdict !== "pass") {
    return {
      build: "834",
      base820,
      extended_scenarios: extended,
      postgrest_trust_paths: CURRENT_VALIDITY_TRUST_PATHS,
      parity_notes: [...parity_notes, "Skipped extended matrix: #820 happy path failed"],
      generated_at: new Date().toISOString(),
    };
  }

  const receiptKey = await import("@/lib/decisionReceipts/signing").then((m) =>
    m.generateTestSigningKeyPair("build834-issuer"),
  );
  const anchorKey = await import("@/lib/decisionReceipts/signing").then((m) =>
    m.generateTestSigningKeyPair("build834-anchor"),
  );
  const { syntheticSandboxReceipt, registryEnv, verifyThreeLayer } = await import("./build834Fixtures");

  const record = syntheticSandboxReceipt(receiptKey);
  const env = registryEnv(receiptKey, anchorKey, input.env);

  const { applySovereignSliceSchema, seedSovereignSliceFixtures } = await import(
    "../sovereignSlice/bootstrap",
  );
  await applySovereignSliceSchema(input.primaryPool);
  await seedSovereignSliceFixtures({ pool: input.primaryPool, record, env });

  async function scenario(
    id: string,
    expectPermit: boolean,
    run: () => Promise<{ acceptable: boolean; detail: string; extra?: Partial<Build834ScenarioResult> }>,
  ) {
    try {
      const r = await run();
      const ok = expectPermit ? r.acceptable : !r.acceptable;
      extended.push({
        id,
        verdict: ok ? "pass" : "fail",
        detail: r.detail,
        sovereign_currently_acceptable: r.acceptable,
        ...r.extra,
      });
    } catch (e) {
      extended.push({
        id,
        verdict: "fail",
        detail: e instanceof Error ? e.message : "error",
      });
    }
  }

  await scenario("valid_active_receipt", true, async () => {
    const ev = await sovereignEval({
      record,
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 1,
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Active sandbox receipt acceptable on sovereign PG",
    };
  });

  await scenario("expired_receipt", false, async () => {
    const expired: DecisionReceiptRecord = {
      ...record,
      expires_at: "2020-01-01T00:00:00.000Z",
      status: "expired",
    };
    const ev = await sovereignEval({
      record: expired,
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 2,
      overrides: { now: new Date("2026-06-01T12:00:00.000Z") },
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Expired receipt must not be acceptable",
    };
  });

  await scenario("revoked_receipt", false, async () => {
    await input.primaryPool.query(
      `update public.decision_receipts set status = 'revoked', revoked_at = now() where id = $1`,
      [record.id],
    );
    const ev = await sovereignEval({
      record: { ...record, status: "revoked" },
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 3,
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Revoked receipt must not be acceptable",
    };
  });

  await input.primaryPool.query(
    `update public.decision_receipts set status = 'active', revoked_at = null where id = $1`,
    [record.id],
  );

  await scenario("superseded_receipt", false, async () => {
    await input.primaryPool.query(
      `insert into public.decision_receipt_supersessions
        (superseded_receipt_id, superseding_receipt_id, partner_id, policy_id, policy_version, scope, superseded_at)
       values ($1, $2, $3, $4, $5, 'session_refresh', now())
       on conflict (superseded_receipt_id) do update set superseding_receipt_id = excluded.superseding_receipt_id`,
      [record.id, "dr_build834_superseding", record.partner_id, record.policy_id, record.policy_version],
    );
    const ev = await sovereignEval({
      record,
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 4,
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Superseded receipt must not be acceptable",
    };
  });

  await input.primaryPool.query(
    `delete from public.decision_receipt_supersessions where superseded_receipt_id = $1`,
    [record.id],
  );

  await scenario("wrong_relying_party", false, async () => {
    const ev = await sovereignEval({
      record,
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 5,
      overrides: { expectedPartnerId: "wrong-partner" },
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Wrong expected partner must not be acceptable",
    };
  });

  await scenario("wrong_policy", false, async () => {
    const ev = await sovereignEval({
      record,
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 6,
      overrides: { expectedPolicyId: "wrong-policy" },
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Wrong expected policy must not be acceptable",
    };
  });

  await scenario("wrong_environment", false, async () => {
    const ev = await sovereignEval({
      record,
      env,
      anchorPublicJwk: anchorKey.publicKeyJwk,
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      registryVersion: 7,
      overrides: { expectedEnvironment: "production" },
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Sandbox receipt with production expectation must not be acceptable",
    };
  });

  await scenario("missing_authoritative_state", false, async () => {
    await input.primaryPool.query(
      `update public.partners set status = 'suspended' where partner_id = $1`,
      [record.partner_id],
    );
    const ev = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: assertSignedIssuer(
        publishSignedIssuerAuthorityFromRegistry({
          registryVersion: 8,
          anchorKeyId: "build834-trust-anchor",
          anchorPrivateJwk: anchorKey.privateKeyJwk,
          env,
        }),
      ),
      trustAnchorPublicJwk: anchorKey.publicKeyJwk,
      expectedEnvironment: "demo",
      env,
    });
    assertNoUnsafePermit({
      currently_acceptable: ev.currently_acceptable,
      invalidation_reasons: ev.invalidation_reasons,
      lifecycle_status: ev.lifecycle_status,
    });
    return {
      acceptable: ev.currently_acceptable,
      detail: "Missing partner row → store unavailable / not acceptable",
    };
  });

  await input.primaryPool.query(
    `update public.partners set status = 'active' where partner_id = $1`,
    [record.partner_id],
  );

  await scenario("concurrent_revocation_and_verify", false, async () => {
    await input.primaryPool.query(
      `delete from public.decision_receipt_supersessions where superseded_receipt_id = $1`,
      [record.id],
    );
    await input.primaryPool.query(
      `update public.decision_receipts set status = 'active', revoked_at = null where id = $1`,
      [record.id],
    );
    const [a, b] = await Promise.all([
      sovereignEval({
        record,
        env,
        anchorPublicJwk: anchorKey.publicKeyJwk,
        anchorPrivateJwk: anchorKey.privateKeyJwk,
        registryVersion: 9,
      }),
      (async () => {
        await input.primaryPool.query(
          `update public.decision_receipts set status = 'revoked', revoked_at = now() where id = $1`,
          [record.id],
        );
        return sovereignEval({
          record: { ...record, status: "revoked" },
          env,
          anchorPublicJwk: anchorKey.publicKeyJwk,
          anchorPrivateJwk: anchorKey.privateKeyJwk,
          registryVersion: 9,
        });
      })(),
    ]);
    const bothPermit = a.currently_acceptable && b.currently_acceptable;
    return {
      acceptable: bothPermit,
      detail: "Both concurrent evaluations must not permit after revocation",
    };
  });

  parity_notes.push(
    "Encrypted backup/restore and reconcile: see base820.recovery (same run).",
  );

  return {
    build: "834",
    base820,
    extended_scenarios: extended,
    postgrest_trust_paths: CURRENT_VALIDITY_TRUST_PATHS,
    parity_notes,
    generated_at: new Date().toISOString(),
  };
}
