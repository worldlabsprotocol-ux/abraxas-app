// FILE: lib/passport/reusableCredential/fixtures.ts

import { createHash, randomBytes } from "crypto";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PRIMARY_KEY,
} from "@/lib/institutionalCertification/build546/fixtures";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import { portableRevocationStatusId } from "@/lib/protocol/portableRevocation/statusId";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
  type PassportReusableCredentialPayload,
  type SignedPassportReusableCredential,
} from "./contract";
import { signPassportReusableCredential } from "./sign";

export const BUILD_566_HOLDER_SUBJECT = "abx_hs_56600000000000000000000000000001";
export const BUILD_566_PARTNER_A = "institutional-rp-example";
export const BUILD_566_PARTNER_B = "sandbox-partner-beta";
export const BUILD_566_POLICY_ID = "institutional-age-21-v1";
export const BUILD_566_CREDENTIAL_ISSUER = CLAIM_ISSUERS.abraxas;

export const BUILD_566_POLICY_RULES: PartnerPolicyRules = {
  sandbox_only: true,
  required_claims: [
    {
      claim_type: "product_eligibility",
      must_equal: PRODUCT_ELIGIBILITY_OVER_21,
      max_age_hours: 8760,
      min_assurance: "L2",
    },
  ],
};

export function build566SyntheticReusableCredential(input?: {
  credentialId?: string;
  holderSubjectId?: string;
  expiresAt?: string;
}): SignedPassportReusableCredential {
  const credentialId = input?.credentialId ?? "pc_566_synthetic_eligibility";
  const holderSubjectId = input?.holderSubjectId ?? BUILD_566_HOLDER_SUBJECT;
  const issuedAt = BUILD_546_FIXTURE_NOW.toISOString();
  const expiresAt = input?.expiresAt ?? "2027-06-01T12:00:00.000Z";
  const evidenceHash = createHash("sha256").update("synthetic-idv-evidence-566", "utf8").digest("hex");
  const possessionRef = createHash("sha256")
    .update(`possession:${holderSubjectId}:${randomBytes(8).toString("hex")}`, "utf8")
    .digest("hex")
    .slice(0, 32);

  const payload: PassportReusableCredentialPayload = {
    credential_id: credentialId,
    schema_version: PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
    issuer_id: BUILD_566_CREDENTIAL_ISSUER,
    signing_key_id: BUILD_546_PRIMARY_KEY.signingKeyId,
    holder_subject_id: holderSubjectId,
    holder_possession_ref: possessionRef,
    assurance_level: "L2",
    provenance: {
      idv_method: "sandbox_fixture",
      evidence_reference_hash: evidenceHash,
      wallet_ownership_not_sufficient: true,
    },
    asserted_claims: [
      {
        claim_id: "claim-566-product-eligibility",
        claim_type: "product_eligibility",
        claim_value_ref: `hash:${PRODUCT_ELIGIBILITY_OVER_21}`,
        issuer_id: BUILD_566_CREDENTIAL_ISSUER,
        assurance_level: "L2",
        issued_at: issuedAt,
        expires_at: expiresAt,
        status: "active",
      },
    ],
    issued_at: issuedAt,
    expires_at: expiresAt,
    revocation_status_id: portableRevocationStatusId(credentialId, PORTABLE_REVOCATION_TEST_ISSUER_ID),
    custody_note: "credential_export_not_account_recovery",
  };

  return signPassportReusableCredential(payload, BUILD_546_PRIMARY_KEY);
}

export function build566RevocationSnapshotForCredential(credentialId: string) {
  return buildSyntheticPortableRevocationSnapshot({
    receiptId: credentialId,
    state: "active",
  });
}
