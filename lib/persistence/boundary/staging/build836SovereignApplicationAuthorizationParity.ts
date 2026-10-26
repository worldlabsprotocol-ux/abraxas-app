// FILE: lib/persistence/boundary/staging/build836SovereignApplicationAuthorizationParity.ts
// Build #836 — Launchpad application scope on sovereign current-validity.

import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { evaluateOperationalApplicationScope } from "@/lib/decisionReceipts/currentValidity/applicationScope";
import { assertNoUnsafePermit } from "@/lib/decisionReceipts/currentValidity/unifiedContract";
import { publishSignedIssuerAuthorityFromRegistry } from "../issuerAuthority/buildFromRegistry";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";
import { evaluateApplicationScopeOnSovereignPg } from "../verticalSlice/applicationScopeRead";
import {
  syntheticSandboxReceipt,
  registryEnv,
  verifyThreeLayer,
} from "./build834Fixtures";
import { applySovereignSliceSchema, seedSovereignSliceFixtures } from "../sovereignSlice/bootstrap";

export type Build836ScenarioResult = {
  id: string;
  verdict: "pass" | "fail";
  detail: string;
};

export type Build836ApplicationScopeReport = {
  build: "836";
  gap_confirmed: boolean;
  enforcement_points: string[];
  scenarios: Build836ScenarioResult[];
  generated_at: string;
};

const APP_AUTHORIZED = "00000000-0000-4000-8000-000000008836";
const APP_WRONG = "00000000-0000-4000-8000-000000008837";
const APP_OTHER_TENANT = "00000000-0000-4000-8000-000000008838";

function assertSignedIssuer(
  value: ReturnType<typeof publishSignedIssuerAuthorityFromRegistry>,
) {
  if ("payload" in value) return value;
  throw new Error(value.reason);
}

async function seedApplicationBinding(input: {
  pool: Pool;
  applicationId: string;
  partnerId: string;
  receiptId: string;
  status: "active" | "suspended" | "pending";
  bindReceipt: boolean;
  revokedAt?: string | null;
}) {
  await input.pool.query(
    `insert into public.partner_launchpad_applications (id, partner_id, status, policy_id, policy_version)
     values ($1::uuid, $2, $3, 'policy-build834', 1)
     on conflict (id) do update set status = excluded.status, partner_id = excluded.partner_id`,
    [input.applicationId, input.partnerId, input.status],
  );
  if (input.bindReceipt) {
    await input.pool.query(
      `insert into public.partner_launchpad_signed_receipts (receipt_id, application_id, partner_id, revoked_at)
       values ($1, $2::uuid, $3, $4)
       on conflict (receipt_id) do update set
         application_id = excluded.application_id,
         partner_id = excluded.partner_id,
         revoked_at = excluded.revoked_at`,
      [input.receiptId, input.applicationId, input.partnerId, input.revokedAt ?? null],
    );
  }
}

async function sovereignEval(input: {
  record: ReturnType<typeof syntheticSandboxReceipt>;
  env: Record<string, string | undefined>;
  anchorKey: ReturnType<typeof generateTestSigningKeyPair>;
  expectedApplicationId?: string | null;
  expectedPartnerId?: string;
  expectedPolicyId?: string;
}) {
  const signedIssuer = assertSignedIssuer(
    publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 12,
      anchorKeyId: "build834-trust-anchor",
      anchorPrivateJwk: input.anchorKey.privateKeyJwk,
      env: input.env,
    }),
  );
  const evaluation = await evaluateSovereignCurrentValidity({
    record: input.record,
    signedIssuerAuthority: signedIssuer,
    trustAnchorPublicJwk: input.anchorKey.publicKeyJwk,
    expectedEnvironment: "demo",
    expectedApplicationId: input.expectedApplicationId,
    expectedPartnerId: input.expectedPartnerId,
    expectedPolicyId: input.expectedPolicyId,
    env: input.env,
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

export async function runBuild836SovereignApplicationAuthorizationParity(input: {
  primaryPool: Pool;
  env: Record<string, string | undefined>;
}): Promise<Build836ApplicationScopeReport> {
  const scenarios: Build836ScenarioResult[] = [];
  const receiptKey = generateTestSigningKeyPair("build836-issuer");
  const anchorKey = generateTestSigningKeyPair("build836-anchor");
  const statusSignerKey = generateTestSigningKeyPair("build836-status-signer");
  const baseEnv = {
    ...registryEnv(receiptKey, anchorKey, input.env),
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
  };
  const record = syntheticSandboxReceipt(receiptKey);

  await applySovereignSliceSchema(input.primaryPool);
  await seedSovereignSliceFixtures({ pool: input.primaryPool, record, env: baseEnv });

  async function runScenario(id: string, fn: () => Promise<void>) {
    try {
      await fn();
      scenarios.push({ id, verdict: "pass", detail: "ok" });
    } catch (e) {
      scenarios.push({
        id,
        verdict: "fail",
        detail: e instanceof Error ? e.message : "error",
      });
    }
  }

  await runScenario("authorized_application_permits_with_scope", async () => {
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: true,
    });
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_AUTHORIZED,
    });
    if (!ev.currently_acceptable) {
      throw new Error(`expected_permit got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("unknown_application_denies", async () => {
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: randomUUID(),
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_unknown_app");
    if (!ev.invalidation_reasons.includes("application_unbound")) {
      throw new Error(`expected application_unbound got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("disabled_application_denies", async () => {
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_WRONG,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "suspended",
      bindReceipt: true,
    });
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_WRONG,
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_suspended_app");
    if (!ev.invalidation_reasons.includes("application_inactive")) {
      throw new Error(`expected application_inactive got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("cross_tenant_application_substitution_denies", async () => {
    await input.primaryPool.query(
      `insert into public.partners (partner_id, status) values ('partner-other-836', 'active')
       on conflict do nothing`,
    );
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_OTHER_TENANT,
      partnerId: "partner-other-836",
      receiptId: record.id,
      status: "active",
      bindReceipt: false,
    });
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_OTHER_TENANT,
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_cross_tenant");
    if (!ev.invalidation_reasons.includes("application_mismatch")) {
      throw new Error(`expected application_mismatch got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("correct_partner_wrong_application_denies", async () => {
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: true,
    });
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_WRONG,
      partnerId: record.partner_id,
      receiptId: "dr_other_receipt",
      status: "active",
      bindReceipt: false,
    });
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_WRONG,
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_wrong_app");
    if (!ev.invalidation_reasons.includes("application_mismatch")) {
      throw new Error(`expected application_mismatch got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("wrong_audience_still_denies", async () => {
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: true,
    });
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_AUTHORIZED,
      expectedPolicyId: "wrong-policy",
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_wrong_audience");
    if (!ev.invalidation_reasons.includes("policy_audience_mismatch")) {
      throw new Error(`expected policy_audience_mismatch got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("missing_binding_when_scope_required_denies", async () => {
    await input.primaryPool.query(
      `delete from public.partner_launchpad_signed_receipts where receipt_id = $1`,
      [record.id],
    );
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: false,
    });
    const ev = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_AUTHORIZED,
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_unbound");
    if (!ev.invalidation_reasons.includes("application_unbound")) {
      throw new Error(`expected application_unbound got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("revoked_receipt_still_denies_with_valid_app", async () => {
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: true,
    });
    await input.primaryPool.query(
      `update public.decision_receipts set status = 'revoked', revoked_at = now() where id = $1`,
      [record.id],
    );
    const ev = await sovereignEval({
      record: { ...record, status: "revoked", revoked_at: new Date().toISOString() },
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_AUTHORIZED,
    });
    if (ev.currently_acceptable) throw new Error("unsafe_permit_revoked");
    if (!ev.invalidation_reasons.includes("receipt_revoked")) {
      throw new Error(`expected receipt_revoked got ${ev.invalidation_reasons.join(",")}`);
    }
  });

  await runScenario("operational_sovereign_scope_parity_on_pg", async () => {
    await input.primaryPool.query(`delete from public.partner_launchpad_signed_receipts`);
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: true,
    });
    const operationalScope = await evaluateOperationalApplicationScope({
      receiptId: record.id,
      partnerId: record.partner_id,
      applicationId: APP_AUTHORIZED,
      env: baseEnv,
    });
    const sovereignScope = await evaluateApplicationScopeOnSovereignPg({
      receiptId: record.id,
      partnerId: record.partner_id,
      expectedApplicationId: APP_AUTHORIZED,
      env: baseEnv,
    });
    if (operationalScope.application_scope_satisfied !== sovereignScope.application_scope_satisfied) {
      throw new Error("scope_parity_mismatch");
    }
    if (operationalScope.reasons.sort().join(",") !== sovereignScope.reasons.sort().join(",")) {
      throw new Error(
        `scope_reason_parity_mismatch op=${operationalScope.reasons.join(",")} sv=${sovereignScope.reasons.join(",")}`,
      );
    }
  });

  await runScenario("portable_verifier_fail_closed_without_app_scope", async () => {
    await seedApplicationBinding({
      pool: input.primaryPool,
      applicationId: APP_AUTHORIZED,
      partnerId: record.partner_id,
      receiptId: record.id,
      status: "active",
      bindReceipt: true,
    });
    const verifier = await verifyThreeLayer({
      record,
      env: baseEnv,
      anchorKey,
      registryVersion: 12,
    });
    if (verifier.currently_acceptable !== "yes") {
      throw new Error("expected_permit_without_app_gate_on_portable_path");
    }
    const scoped = await sovereignEval({
      record,
      env: baseEnv,
      anchorKey,
      expectedApplicationId: APP_WRONG,
    });
    if (scoped.currently_acceptable) throw new Error("scoped_eval_must_deny_wrong_app");
  });

  const failed = scenarios.filter((s) => s.verdict === "fail");
  if (failed.length > 0) {
    throw new Error(`build836_scenarios_failed: ${failed.map((f) => f.id).join(",")}`);
  }

  return {
    build: "836",
    gap_confirmed: true,
    enforcement_points: [
      "partner_launchpad_applications (sovereign PG / slice)",
      "partner_launchpad_signed_receipts authoritative receipt_id binding",
      "evaluateSovereignCurrentValidity expectedApplicationId",
      "evaluateOperationalApplicationScope / evaluateReceiptCurrentValidity applicationId",
      "deriveCurrentValidityDecision application_scope_satisfied + hard deny reasons",
      "Launchpad GET .../receipts/validate (binding before trust)",
    ],
    scenarios,
    generated_at: new Date().toISOString(),
  };
}
