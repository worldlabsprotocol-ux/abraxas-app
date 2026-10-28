#!/usr/bin/env npx tsx
/**
 * Build 886 Track C — external relying-party execution record (synthetic, no real assets).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildEvidenceCommitment } from "@abraxas/independent-verifier";
import {
  BASE_TRANSACTION,
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
  sealedExecution,
  trustedPolicyForMandate,
} from "../../lib/institutional/mandate/controlledIssuerFixture";
import { enforceProtectedInstitutionalAction } from "../../lib/institutional/mandate/enforceInstitutionalAction";

const OUT = resolve("/opt/cursor/artifacts/build-886");
mkdirSync(OUT, { recursive: true });

function main(): void {
  const fixture = buildControlledMandateIssuerFixture();
  const signed = buildControlledSignedMandate({ fixture });
  const manifest = [
    {
      dependency_type: "reusable_fact" as const,
      fact_id: signed.payload.mandate_id,
      source_credential_id: null,
    },
  ];
  const commitment = buildEvidenceCommitment(manifest);
  const now = new Date("2026-06-15T12:00:00.000Z");
  const policy = trustedPolicyForMandate(signed.payload, "mandate_and_abraxas_receipt");
  const execution = sealedExecution(BASE_TRANSACTION, "exec_build886_permit");

  const permit = enforceProtectedInstitutionalAction({
    signedMandate: signed,
    signedIssuerAuthority: fixture.signedIssuerAuthority,
    trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
    trustedEnforcementPolicy: policy,
    trustedExecution: execution,
    now,
    independentReceipt: {
      cryptographically_verified: true,
      outcome: "permit",
      policy_id: signed.payload.policy_id,
      policy_version: signed.payload.policy_version,
      evidence_commitment: commitment,
      evidence_manifest: manifest,
    },
  });

  const denyExecution = sealedExecution(
    { ...BASE_TRANSACTION, amount_usd: signed.payload.max_amount_usd + 1 },
    "exec_build886_deny",
  );
  const deny = enforceProtectedInstitutionalAction({
    signedMandate: signed,
    signedIssuerAuthority: fixture.signedIssuerAuthority,
    trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
    trustedEnforcementPolicy: policy,
    trustedExecution: denyExecution,
    now,
    independentReceipt: {
      cryptographically_verified: true,
      outcome: "permit",
      policy_id: signed.payload.policy_id,
      policy_version: signed.payload.policy_version,
      evidence_commitment: commitment,
      evidence_manifest: manifest,
    },
  });

  const record = {
    build: 886,
    issuer_fixture: fixture.label,
    trusted_policy: policy,
    permit: {
      execution_id: permit.execution_id,
      mandate_id: signed.payload.mandate_id,
      policy_version: signed.payload.policy_version,
      context_digest: execution.context_digest,
      enforcement_action: permit.enforcement_action,
      reasons: permit.reasons,
    },
    deny: {
      execution_id: deny.execution_id,
      context_digest: denyExecution.context_digest,
      enforcement_action: deny.enforcement_action,
      reasons: deny.reasons,
    },
  };

  writeFileSync(resolve(OUT, "external-rp-execution.json"), JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record, null, 2));
}

main();
