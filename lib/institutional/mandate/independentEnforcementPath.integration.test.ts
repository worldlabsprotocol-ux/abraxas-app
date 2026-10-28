// FILE: lib/institutional/mandate/independentEnforcementPath.integration.test.ts
// Track B — separate relying-party process (no Abraxas DB).

import { describe, expect, it } from "vitest";
import { buildEvidenceCommitment } from "@abraxas/independent-verifier";
import {
  BASE_TRANSACTION,
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
} from "./controlledIssuerFixture";
import { enforceInstitutionalAction } from "./enforceInstitutionalAction";

describe("Build 885 independent enforcement path", () => {
  it("permits only when mandate, receipt binding, and transaction scope align", () => {
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

    const permit = enforceInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      transaction: BASE_TRANSACTION,
      now: new Date("2026-06-15T12:00:00.000Z"),
      independentReceipt: {
        cryptographically_verified: true,
        outcome: "permit",
        policy_id: signed.payload.policy_id,
        policy_version: signed.payload.policy_version,
        evidence_commitment: commitment,
        evidence_manifest: manifest,
      },
    });
    expect(permit.enforcement_action).toBe("permit");
    expect(permit.mandate_outcome).toBe("permit");

    const deny = enforceInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      transaction: { ...BASE_TRANSACTION, amount_usd: signed.payload.max_amount_usd + 1 },
      now: new Date("2026-06-15T12:00:00.000Z"),
      independentReceipt: {
        cryptographically_verified: true,
        outcome: "permit",
        policy_id: signed.payload.policy_id,
        policy_version: signed.payload.policy_version,
        evidence_commitment: commitment,
        evidence_manifest: manifest,
      },
    });
    expect(deny.enforcement_action).toBe("deny");
  });
});
