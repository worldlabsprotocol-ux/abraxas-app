// FILE: lib/persistence/boundary/staging/build837SovereignEvidenceIntegrity.ts

import type { Pool } from "pg";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { evaluateClaimEvidenceOnSovereignPg } from "../verticalSlice/claimEvidenceRead";
import { mirrorReuseEvidenceIntegrityOnSovereignPg } from "../verticalSlice/evidenceIntegrityWrite.server";
import { applySovereignSliceSchema, seedSovereignSliceFixtures } from "../sovereignSlice/bootstrap";
import { syntheticSandboxReceipt, registryEnv } from "./build834Fixtures";
import type { InternalReusableFact } from "@/lib/passport/reusableEligibility/contract";
import { derivedClaimRefs } from "@/lib/passport/reusableEligibility/issue";

export type Build837Scenario = { id: string; verdict: "pass" | "fail"; detail: string };

export type Build837Report = {
  build: "837";
  defect: string;
  scenarios: Build837Scenario[];
  generated_at: string;
};

const FACT: InternalReusableFact = {
  fact_id: "fact_build837",
  subject_pseudonym_id: "psr_build837",
  pack_id: "age_21_retail",
  policy_version: 1,
  minimum_assurance: "L2",
  method_category: "reuse_existing_proof",
  result_category: "approved",
  disclosure_boundary: "partner_bound",
  decision_context: "sandbox_only",
  source_policy_id: "policy-build834",
  source_verification_method: "reuse_existing_proof",
  verified_at: "2026-06-01T12:00:00.000Z",
  source_receipt_id: "dr_build834_synthetic",
  source_decision_id: "00000000-0000-4000-8000-000000008834",
  issued_at: "2026-06-01T12:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  status: "active",
  derived_from_fact_id: null,
};

export async function runBuild837SovereignEvidenceIntegrity(input: {
  primaryPool: Pool;
  env: Record<string, string | undefined>;
}): Promise<Build837Report> {
  const scenarios: Build837Scenario[] = [];
  const receiptKey = generateTestSigningKeyPair("build837-issuer");
  const anchorKey = generateTestSigningKeyPair("build837-anchor");
  const baseEnv = registryEnv(receiptKey, anchorKey, input.env);
  const sourceRecord = syntheticSandboxReceipt(receiptKey);
  const derivedId = "dr_build837_derived";

  await applySovereignSliceSchema(input.primaryPool);
  await seedSovereignSliceFixtures({ pool: input.primaryPool, record: sourceRecord, env: baseEnv });
  await input.primaryPool.query(
    `insert into public.decision_receipts (
       id, verification_decision_id, consent_receipt_id, partner_id, policy_id, policy_version,
       subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes, evaluated_claim_refs,
       issuer_refs, decision_context, evaluated_at, expires_at, revoked_at, status, schema_version,
       payload_hash, signature, signing_key_id, created_at
     ) select $1, verification_decision_id, consent_receipt_id, partner_id, policy_id, policy_version,
       subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes, evaluated_claim_refs,
       issuer_refs, decision_context, evaluated_at, expires_at, revoked_at, status, schema_version,
       payload_hash, signature, signing_key_id, now()
     from public.decision_receipts where id = $2
     on conflict (id) do nothing`,
    [derivedId, sourceRecord.id],
  );

  const claimRefs = derivedClaimRefs(FACT, sourceRecord.policy_id);
  await input.primaryPool.query(
    `update public.decision_receipts set evaluated_claim_refs = $1::jsonb where id = $2`,
    [JSON.stringify(claimRefs), derivedId],
  );

  async function run(id: string, fn: () => Promise<void>) {
    try {
      await fn();
      scenarios.push({ id, verdict: "pass", detail: "ok" });
    } catch (e) {
      scenarios.push({ id, verdict: "fail", detail: e instanceof Error ? e.message : "error" });
    }
  }

  await run("mirror_populates_sovereign_evidence_graph", async () => {
    const mirror = await mirrorReuseEvidenceIntegrityOnSovereignPg({
      derivedReceiptId: derivedId,
      fact: FACT,
      derivedClaimRefs: claimRefs,
      env: baseEnv,
    });
    if (!mirror.mirrored) throw new Error(String(mirror.reason));
    const derived = await input.primaryPool.query(
      `select id, evaluated_claim_refs from public.decision_receipts where id = $1`,
      [derivedId],
    );
    const ev = await evaluateClaimEvidenceOnSovereignPg(
      {
        ...sourceRecord,
        id: derivedId,
        evaluated_claim_refs: derived.rows[0].evaluated_claim_refs,
      },
      baseEnv,
    );
    if (!ev.evidence_current || !ev.claims_current) {
      throw new Error(`expected_current got ${ev.reasons.join(",")}`);
    }
  });

  await run("revoked_source_denies_evidence_current", async () => {
    await input.primaryPool.query(
      `update public.sovereign_evidence_sources set status = 'revoked', revoked_at = now()
       where source_credential_id = $1`,
      [FACT.source_receipt_id],
    );
    const derived = await input.primaryPool.query(
      `select evaluated_claim_refs from public.decision_receipts where id = $1`,
      [derivedId],
    );
    const ev = await evaluateClaimEvidenceOnSovereignPg(
      {
        ...sourceRecord,
        id: derivedId,
        evaluated_claim_refs: derived.rows[0].evaluated_claim_refs,
      },
      baseEnv,
    );
    if (ev.evidence_current) throw new Error("unsafe_permit_revoked_source");
    if (!ev.reasons.includes("source_evidence_revoked")) {
      throw new Error(`expected source_evidence_revoked got ${ev.reasons.join(",")}`);
    }
  });

  await run("unmirrored_claims_fail_closed_via_claim_missing", async () => {
    const isolatedClaimRefs = derivedClaimRefs(
      { ...FACT, fact_id: "fact_isolated", subject_pseudonym_id: "psr_isolated" },
      "policy-isolated-837",
    );
    const isolatedId = "dr_build837_unmirrored";
    await input.primaryPool.query(
      `insert into public.decision_receipts (
         id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id,
         decision_result, reason_codes, evaluated_claim_refs, issuer_refs, decision_context,
         evaluated_at, expires_at, status, schema_version, payload_hash, signature, signing_key_id
       ) values (
         $1, gen_random_uuid(), $2, $3, 1, 'psr_x', 'approved', '{}', $5::jsonb, '{}', 'sandbox_only',
         now(), '2099-01-01', 'active', '1.0.0', 'h', 's', $4
       ) on conflict do nothing`,
      [
        isolatedId,
        sourceRecord.partner_id,
        sourceRecord.policy_id,
        sourceRecord.signing_key_id,
        JSON.stringify(isolatedClaimRefs),
      ],
    );
    const ev = await evaluateClaimEvidenceOnSovereignPg(
      {
        ...sourceRecord,
        id: isolatedId,
        evaluated_claim_refs: isolatedClaimRefs,
      },
      baseEnv,
    );
    if (ev.claims_current) throw new Error("expected_claim_missing_without_mirror");
    if (!ev.reasons.includes("claim_missing")) {
      throw new Error(`expected claim_missing got ${ev.reasons.join(",")}`);
    }
  });

  const failed = scenarios.filter((s) => s.verdict === "fail");
  if (failed.length) throw new Error(`build837_failed:${failed.map((f) => f.id).join(",")}`);

  return {
    build: "837",
    defect:
      "Reuse issuance wrote Supabase evidence dependencies only; sovereign PG had no mirror, so portable/sovereign validity skipped source revocation.",
    scenarios,
    generated_at: new Date().toISOString(),
  };
}
