// FILE: lib/assurance/selfAttestation/tieredAgeAssurance.test.ts
// Tiered age-assurance lifecycle — L0 browse vs L2+ regulated boundaries.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ageInWholeYearsUtc,
  deriveSelfAttestedAgeBand,
  parseIsoDateUtc,
  utcToday,
} from "./calculateAgeBand";
import { isBlockedSelfAttestationPurpose } from "./purposePolicy";
import { ledgerRowsToClaims } from "./selfAttestationClaims";
import { buildBrowseReceiptPayload, signBrowseAccessReceipt, verifyBrowseAccessReceipt } from "./browseReceipt";
import { emitSelfAttestationAuditEvent } from "./selfAttestationAudit";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { PRODUCTION_PARTNER_POLICIES, GOOD_TROUBLE_RETAIL_V2_PENDING_RULES } from "@/lib/policy/productionPolicyContract";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  evaluateSocialSignalForAgePolicy,
  claimedSocialBirthdayCannotSatisfyPolicy,
} from "@/lib/assurance/ageProviders/socialSignalPolicy";
import { validateSandboxReceipt } from "../../../examples/good-trouble-wix/backend/abraxasReceiptValidator.js";
import { authorizeRegulatedCheckout } from "../../../examples/good-trouble-wix/backend/checkoutAuthorization.js";
import { validateBrowseAccessPayload } from "../../../examples/good-trouble-wix/backend/browseReceiptValidator.js";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

const HOLDER = normalizeSuiAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
const TEST_KEY = generateTestSigningKeyPair();

function browseClaim(overrides: Partial<CredentialClaimRecord> = {}): CredentialClaimRecord {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 3600000).toISOString();
  return {
    id: "self-attest:test",
    subject_id: HOLDER,
    credential_jti: null,
    claim_type: "self_attested_age_band",
    claim_value: {
      outcome: "over_21",
      provenance: "user_self_attestation",
      purpose: "browse",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    },
    issuer_id: "issuer:abraxas-self-attest",
    assurance_level: "L0",
    issued_at: now,
    expires_at: expires,
    status: "active",
    revocation_reference: null,
    evidence_reference: "br_test",
    jurisdiction: null,
    policy_scope: GOOD_TROUBLE_BROWSE_POLICY_ID,
    ...overrides,
  };
}

describe("UTC calendar age boundaries", () => {
  it("calculates whole years on UTC calendar boundaries", () => {
    const dob = new Date(Date.UTC(2000, 1, 29));
    const asOf = new Date(Date.UTC(2021, 1, 28));
    expect(ageInWholeYearsUtc(dob, asOf)).toBe(20);
    expect(ageInWholeYearsUtc(dob, new Date(Date.UTC(2021, 1, 29)))).toBe(21);
  });

  it("handles leap-day birthdays", () => {
    const dob = new Date(Date.UTC(2004, 1, 29));
    const asOf = new Date(Date.UTC(2025, 2, 1));
    expect(ageInWholeYearsUtc(dob, asOf)).toBe(21);
  });

  it("rejects future, invalid, and implausible DOB", () => {
    expect(parseIsoDateUtc("2030-01-01").ok).toBe(false);
    expect(parseIsoDateUtc("2020-13-01").ok).toBe(false);
    expect(parseIsoDateUtc("2020-02-30").ok).toBe(false);
    expect(parseIsoDateUtc("2015-01-01").ok).toBe(false);
    expect(parseIsoDateUtc("1800-01-01").ok).toBe(false);
  });

  it("derives age band without retaining DOB", () => {
    const parsed = parseIsoDateUtc("2000-06-15");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(deriveSelfAttestedAgeBand(parsed.dobUtc, 21, utcToday(new Date("2025-06-15T12:00:00Z")))).toBe("over_21");
    expect(deriveSelfAttestedAgeBand(parsed.dobUtc, 21, utcToday(new Date("2020-06-14T12:00:00Z")))).toBe("under_21");
  });
});

describe("self-attestation service privacy", () => {
  const insertMock = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    insertMock.mockResolvedValue({
      ok: true,
      row: {
        id: "row-1",
        holder_ref: HOLDER,
        partner_id: GOOD_TROUBLE_PARTNER_ID,
        policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
        age_band: "over_21",
        assurance_level: "L0",
        provenance: "user_self_attestation",
        purpose: "browse",
        attested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
        browse_receipt_id: "br_test",
        created_at: new Date().toISOString(),
      },
    });
    vi.doMock("./selfAttestationLedger", () => ({
      insertSelfAttestationRecord: insertMock,
      generateBrowseReceiptId: () => "br_test",
    }));
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(TEST_KEY.privateKeyJwk);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ABRAXAS_SIGNING_KEY;
  });

  it("audit events never contain DOB", () => {
    emitSelfAttestationAuditEvent({
      event: "self_attest_submitted",
      holderRef: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      ageBand: "over_21",
    });
    const logged = (console.info as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
    expect(logged).not.toMatch(/date_of_birth|"dob"/i);
    expect(logged).not.toContain("2000-06-15");
  });

  it("rejects checkout purpose", () => {
    expect(isBlockedSelfAttestationPurpose("checkout")).toBe(true);
    expect(isBlockedSelfAttestationPurpose("purchase")).toBe(true);
    expect(isBlockedSelfAttestationPurpose("delivery")).toBe(true);
    expect(isBlockedSelfAttestationPurpose("browse")).toBe(false);
  });
});

describe("policy engine tier boundaries", () => {
  const browsePolicy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_BROWSE_POLICY_ID)!;

  it("L0 over-21 self-attestation satisfies browse-only policy", () => {
    const evaluation = evaluatePolicyRules(browsePolicy.rules, [browseClaim()]);
    expect(evaluation.decision).toBe("approved");
  });

  it("L0 self-attestation cannot satisfy Good Trouble regulated retail policy", () => {
    const retail = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
    const evaluation = evaluatePolicyRules(retail.rules, [browseClaim()]);
    expect(evaluation.decision).toBe("denied");
  });

  it("L0 cannot satisfy financial or cross-industry L2 policies", () => {
    const rwa = PRODUCTION_PARTNER_POLICIES.find(p => p.id === "abraxas-rwa-us-v1")!;
    const evaluation = evaluatePolicyRules(rwa.rules, [browseClaim()]);
    expect(evaluation.decision).toBe("denied");
  });

  it("expired or revoked self-attestation fails closed", () => {
    const expired = browseClaim({
      status: "expired",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const evaluation = evaluatePolicyRules(browsePolicy.rules, [expired]);
    expect(evaluation.decision).toBe("denied");

    const revoked = browseClaim({ status: "revoked" });
    expect(evaluatePolicyRules(browsePolicy.rules, [revoked]).decision).toBe("denied");
  });

  it("partner and purpose mismatch fails", () => {
    const wrongPartner = browseClaim({
      claim_value: {
        outcome: "over_21",
        provenance: "user_self_attestation",
        purpose: "browse",
        partner_id: "other-partner",
        policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      },
    });
    expect(evaluatePolicyRules(browsePolicy.rules, [wrongPartner], {
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }).decision).toBe("denied");
  });

  it("Google/social authentication cannot satisfy age", () => {
    expect(evaluateSocialSignalForAgePolicy({
      provider: "google",
      authenticated: true,
      emailVerified: true,
      accountSubjectHash: "x",
      claimedBirthday: "1990-01-01",
      accountAgeDays: 1000,
    }, 21).satisfiesPolicy).toBe(false);
    expect(claimedSocialBirthdayCannotSatisfyPolicy("1990-01-01", 21)).toBe(true);
  });

  it("retail v2 pending rules still require authoritative product_eligibility", () => {
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, [browseClaim()]);
    expect(evaluation.decision).toBe("denied");
    expect(evaluation.missing_claims).toContain("product_eligibility");
  });
});

describe("browse receipts", () => {
  beforeEach(() => {
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(TEST_KEY.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });
  afterEach(() => {
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("receipts contain no DOB or raw PII", async () => {
    const payload = buildBrowseReceiptPayload({
      receiptId: "br_test",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      ageBand: "over_21",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      nonce: "nonce",
    });
    const token = await signBrowseAccessReceipt(payload);
    expect(token).toBeTruthy();
    const verified = await verifyBrowseAccessReceipt(token!);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(JSON.stringify(verified.payload)).not.toMatch(/date_of_birth|legal_name|address/i);
    expect(verified.payload.valid_for_purchase).toBe(false);
  });
});

describe("Wix checkout boundary", () => {
  const authoritativeReceipt = {
    signature_valid: true,
    decision_result: "approved",
    status: "active",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    schema_version: "1.0.0",
    artifact_type: "eligibility_decision_receipt",
    production_usable: false,
    decision_context: "sandbox_only",
    invalidation_reasons: ["production_not_usable:false"],
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    evaluated_claim_refs: [],
    assurance_level: "L2",
  };

  const browseReceipt = {
    artifact_type: "browse_access_receipt",
    valid_for_purchase: false,
    purpose: "browse",
    assurance_level: "L0",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  };

  it("URL-only approval fails checkout", () => {
    expect(authorizeRegulatedCheckout({ urlStatus: "approved" }).authorized).toBe(false);
  });

  it("sessionStorage pilot flag fails checkout", () => {
    expect(authorizeRegulatedCheckout({ sessionStoragePurchaseFlag: "1" }).authorized).toBe(false);
  });

  it("self-attested browse-only fails checkout", () => {
    expect(authorizeRegulatedCheckout({ selfAttestedBrowseOnly: true }).authorized).toBe(false);
  });

  it("Wix checkout rejects browse-only results", () => {
    expect(validateSandboxReceipt(browseReceipt).verified).toBe(false);
    expect(authorizeRegulatedCheckout({ receipt: browseReceipt }).authorized).toBe(false);
  });

  it("authoritative sandbox receipt can authorize checkout validation path", () => {
    expect(validateSandboxReceipt(authoritativeReceipt).verified).toBe(true);
    expect(authorizeRegulatedCheckout({
      receipt: authoritativeReceipt,
      flowConsumed: true,
      flowPurpose: "purchase",
      flowPolicyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    }).authorized).toBe(true);
  });

  it("browse payload validator accepts L0 browse receipt shape", () => {
    const result = validateBrowseAccessPayload(browseReceipt);
    expect(result.verified).toBe(true);
  });
});

describe("ledger claims never store DOB", () => {
  it("ledger row mapping stores age band only", () => {
    const claims = ledgerRowsToClaims([{
      id: "id-1",
      holder_ref: HOLDER,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      age_band: "over_21",
      assurance_level: "L0",
      provenance: "user_self_attestation",
      purpose: "browse",
      attested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      revoked_at: null,
      browse_receipt_id: "br_1",
      created_at: new Date().toISOString(),
    }]);
    const serialized = JSON.stringify(claims);
    expect(serialized).not.toMatch(/date_of_birth|birth_year|birth_month|birth_day/i);
    expect(serialized).toContain("over_21");
  });
});
