/**
 * Adversarial matrix for external relying-party verification (Build 868).
 * Uses @abraxas/independent-verifier only — no Abraxas backend imports.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  verifyAbraxasReceiptIndependently,
  validateTrustAnchorBundle,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { enforcementFromVerification } from "../../examples/portable-relying-party/enforceDecision";
import type {
  DecisionReceiptRecord,
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";

export type PortableBundleLike = {
  decision_receipt: DecisionReceiptRecord;
  bundled_trust_anchor: TrustAnchorBundleV1;
  signed_issuer_authority: SignedIssuerAuthorityStatement;
  signed_status_statement: SignedReceiptStatusStatement;
  registry_version: number;
};

export type AdversarialCase = {
  id: string;
  expect_permit: boolean;
  action: "permit" | "deny" | "indeterminate";
  currently_acceptable: "yes" | "no" | "indeterminate";
  failure_codes: string[];
};

function verifyBundle(input: {
  bundle: PortableBundleLike;
  pin: TrustAnchorBundleV1;
  partnerId: string;
  policyId: string;
  now?: Date;
  statementObservedAt?: string;
  omitStatus?: boolean;
}): AdversarialCase & { verified: ReturnType<typeof verifyAbraxasReceiptIndependently> } {
  const verified = verifyAbraxasReceiptIndependently({
    record: input.bundle.decision_receipt,
    pinnedTrustAnchor: input.pin,
    signedIssuerAuthority: input.bundle.signed_issuer_authority,
    signedStatusStatement: input.omitStatus ? null : input.bundle.signed_status_statement,
    relyingParty: {
      partner_id: input.partnerId,
      policy_id: input.policyId,
      environment: "demo",
    },
    statementObservedAt: input.statementObservedAt ?? new Date().toISOString(),
    now: input.now,
  });
  const enforcement = enforcementFromVerification(verified);
  return {
    id: "",
    expect_permit: false,
    action: enforcement.action,
    currently_acceptable: verified.currently_acceptable,
    failure_codes: verified.failure_codes,
    verified,
  };
}

function casePassed(c: AdversarialCase & { id: string }): boolean {
  if (c.expect_permit) {
    return c.action === "permit" && c.currently_acceptable === "yes";
  }
  return c.action !== "permit" && c.currently_acceptable !== "yes";
}

export function runExternalRpAdversarialMatrix(input: {
  bundle: PortableBundleLike;
  pin: TrustAnchorBundleV1;
  partnerId: string;
  policyId: string;
  wrongPartnerId: string;
  substitutePinPath: string;
}): { ok: boolean; cases: (AdversarialCase & { id: string })[] } {
  const cases: (AdversarialCase & { id: string })[] = [];

  const happy = verifyBundle({
    bundle: input.bundle,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "genuine_baseline",
    expect_permit: true,
    action: happy.action,
    currently_acceptable: happy.currently_acceptable,
    failure_codes: happy.failure_codes,
  });

  const tampered = structuredClone(input.bundle);
  const rec = tampered.decision_receipt as { payload_hash?: string };
  rec.payload_hash = "0".repeat(64);
  const tamperedResult = verifyBundle({
    bundle: tampered,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "tampered_receipt_payload",
    expect_permit: false,
    action: tamperedResult.action,
    currently_acceptable: tamperedResult.currently_acceptable,
    failure_codes: tamperedResult.failure_codes,
  });

  const wrongAudience = verifyBundle({
    bundle: input.bundle,
    pin: input.pin,
    partnerId: input.wrongPartnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "incorrect_relying_party_audience",
    expect_permit: false,
    action: wrongAudience.action,
    currently_acceptable: wrongAudience.currently_acceptable,
    failure_codes: wrongAudience.failure_codes,
  });

  const wrongPolicy = verifyBundle({
    bundle: input.bundle,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: "forged-policy-id-not-in-catalog",
  });
  cases.push({
    id: "wrong_policy_binding",
    expect_permit: false,
    action: wrongPolicy.action,
    currently_acceptable: wrongPolicy.currently_acceptable,
    failure_codes: wrongPolicy.failure_codes,
  });

  const substituteRaw = JSON.parse(readFileSync(resolve(input.substitutePinPath), "utf8")) as TrustAnchorBundleV1;
  const subValidated = validateTrustAnchorBundle(substituteRaw);
  const substitutePin =
    subValidated.ok && substituteRaw.public_key_fingerprint !== input.pin.public_key_fingerprint
      ? substituteRaw
      : {
          ...input.pin,
          public_key_fingerprint: "substituted-anchor-fingerprint-not-in-registry",
          anchor_key_id: "substituted-anchor",
        };

  const wrongPin = verifyBundle({
    bundle: input.bundle,
    pin: substitutePin,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "substituted_trust_anchor",
    expect_permit: false,
    action: wrongPin.action,
    currently_acceptable: wrongPin.currently_acceptable,
    failure_codes: wrongPin.failure_codes,
  });

  const expiredStatus = structuredClone(input.bundle);
  if (expiredStatus.signed_status_statement?.payload) {
    expiredStatus.signed_status_statement.payload.receipt_status = "expired";
  }
  const expiredResult = verifyBundle({
    bundle: expiredStatus,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "expired_receipt_status",
    expect_permit: false,
    action: expiredResult.action,
    currently_acceptable: expiredResult.currently_acceptable,
    failure_codes: expiredResult.failure_codes,
  });

  const revokedStatus = structuredClone(input.bundle);
  if (revokedStatus.signed_status_statement?.payload) {
    revokedStatus.signed_status_statement.payload.receipt_status = "revoked";
  }
  const revokedResult = verifyBundle({
    bundle: revokedStatus,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "revoked_receipt_status",
    expect_permit: false,
    action: revokedResult.action,
    currently_acceptable: revokedResult.currently_acceptable,
    failure_codes: revokedResult.failure_codes,
  });

  const staleObserved = verifyBundle({
    bundle: input.bundle,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
    statementObservedAt: "2020-01-01T00:00:00.000Z",
    now: new Date(),
  });
  cases.push({
    id: "stale_signed_status_observation",
    expect_permit: false,
    action: staleObserved.action,
    currently_acceptable: staleObserved.currently_acceptable,
    failure_codes: staleObserved.failure_codes,
  });

  const missingStatus = verifyBundle({
    bundle: input.bundle,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
    omitStatus: true,
  });
  cases.push({
    id: "missing_signed_status_dependency",
    expect_permit: false,
    action: missingStatus.action,
    currently_acceptable: missingStatus.currently_acceptable,
    failure_codes: missingStatus.failure_codes,
  });

  const badIssuer = structuredClone(input.bundle);
  if (badIssuer.signed_issuer_authority?.payload?.registry_version != null) {
    badIssuer.signed_issuer_authority.payload.registry_version += 9999;
  }
  const badIssuerResult = verifyBundle({
    bundle: badIssuer,
    pin: input.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  cases.push({
    id: "incorrect_issuer_authority_statement",
    expect_permit: false,
    action: badIssuerResult.action,
    currently_acceptable: badIssuerResult.currently_acceptable,
    failure_codes: badIssuerResult.failure_codes,
  });

  const ok = cases.every((c) => casePassed(c));
  return { ok, cases };
}
