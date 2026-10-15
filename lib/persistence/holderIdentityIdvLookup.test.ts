// FILE: lib/persistence/holderIdentityIdvLookup.test.ts

import { describe, expect, it } from "vitest";
import {
  hasSupportedIdentityVerificationColumn,
  identityVerificationsColumnSchemaFromRows,
  planIdentityVerificationCountQuery,
} from "./holderIdentityIdvLookup";

const SUI = "0x" + "a".repeat(64);
const HS = "abx_hs_" + "b".repeat(32);

describe("Build #579 identity_verifications column schema", () => {
  it("maps information_schema rows to column flags", () => {
    expect(
      identityVerificationsColumnSchemaFromRows([{ column_name: "sui_address" }]),
    ).toEqual({ walletAddress: false, suiAddress: true, holderSubjectId: false });
  });

  it("detects missing supported columns", () => {
    expect(hasSupportedIdentityVerificationColumn({
      walletAddress: false,
      suiAddress: false,
      holderSubjectId: false,
    })).toBe(false);
  });
});

describe("Build #579 planIdentityVerificationCountQuery", () => {
  it("sui_address only (Production legacy)", () => {
    const plan = planIdentityVerificationCountQuery({
      schema: { walletAddress: false, suiAddress: true, holderSubjectId: false },
      sessionSubjectId: SUI,
      suiAddress: SUI,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.sql).toMatch(/sui_address/i);
    expect(plan.sql).not.toMatch(/wallet_address/i);
    expect(plan.sql).not.toMatch(/holder_subject_id/i);
    expect(plan.params).toEqual([SUI]);
  });

  it("wallet_address only", () => {
    const plan = planIdentityVerificationCountQuery({
      schema: { walletAddress: true, suiAddress: false, holderSubjectId: false },
      sessionSubjectId: SUI,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.sql).toMatch(/wallet_address/i);
    expect(plan.sql).not.toMatch(/sui_address/i);
    expect(plan.params).toEqual([SUI]);
  });

  it("both legacy wallet and sui columns for Sui session", () => {
    const plan = planIdentityVerificationCountQuery({
      schema: { walletAddress: true, suiAddress: true, holderSubjectId: false },
      sessionSubjectId: SUI,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.sql).toMatch(/sui_address/i);
    expect(plan.sql).toMatch(/wallet_address/i);
    expect(plan.params).toHaveLength(1);
  });

  it("canonical holder without authoritative sui binding does not OR-match sui_address", () => {
    const plan = planIdentityVerificationCountQuery({
      schema: { walletAddress: true, suiAddress: true, holderSubjectId: true },
      sessionSubjectId: HS,
      sessionHolderSubjectId: HS,
      suiAddress: SUI,
      authoritativeCanonicalSuiAddress: null,
      legacyLinkSubjectId: null,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.sql).toMatch(/holder_subject_id/i);
    expect(plan.sql).not.toMatch(/sui_address/i);
    expect(plan.params).toEqual([HS]);
  });

  it("canonical holder with verified legacy link may include linked sui only", () => {
    const plan = planIdentityVerificationCountQuery({
      schema: { walletAddress: false, suiAddress: true, holderSubjectId: true },
      sessionSubjectId: HS,
      sessionHolderSubjectId: HS,
      authoritativeCanonicalSuiAddress: SUI,
      legacyLinkSubjectId: HS,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.params).toEqual([HS, SUI]);
    expect(plan.sql).toMatch(/holder_subject_id = \$1/);
    expect(plan.sql).toMatch(/lower\(sui_address\) = lower\(\$2\)/i);
  });

  it("missing identity columns returns no_identity_columns", () => {
    const plan = planIdentityVerificationCountQuery({
      schema: { walletAddress: false, suiAddress: false, holderSubjectId: false },
      sessionSubjectId: SUI,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.code).toBe("no_identity_columns");
  });
});
