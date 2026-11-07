import { describe, expect, it } from "vitest";
import {
  agreeInstitutionalAuthority,
  challengeAgreesWithAuthority,
  institutionalAuthorityFromLaunchpad,
  planInstitutionalAuthoritySync,
  type InstitutionalAuthorityRecord,
} from "./institutionalAuthorityBinding";

const revision = "2026-11-07T20:00:00.000Z";

function source(overrides: Partial<InstitutionalAuthorityRecord> = {}): InstitutionalAuthorityRecord {
  return {
    applicationId: "00000000-0000-4000-8000-000000000001",
    partnerId: "partner-sandbox",
    policyId: "policy-sandbox",
    policyVersion: 3,
    status: "active",
    sourceRevision: revision,
    environment: "sandbox",
    ...overrides,
  };
}

describe("institutional authority binding", () => {
  it("accepts one sandbox application and ignores every other environment", () => {
    expect(institutionalAuthorityFromLaunchpad({
      id: source().applicationId,
      partner_id: source().partnerId,
      policy_id: source().policyId,
      policy_version: 3,
      status: "active",
      updated_at: revision,
      environment: "sandbox",
    })).toEqual(source());
    expect(institutionalAuthorityFromLaunchpad({
      ...{
        id: source().applicationId,
        partner_id: source().partnerId,
        policy_id: source().policyId,
        policy_version: 3,
        status: "active",
        updated_at: revision,
      },
      environment: "production",
    })).toBeNull();
  });

  it("binds one missing sovereign row and leaves an exact binding unchanged", () => {
    const authorized = source();
    expect(planInstitutionalAuthoritySync({
      authorizedApplicationId: authorized.applicationId,
      source: authorized,
      sovereign: null,
    })).toEqual({ ok: true, action: "bind", binding: authorized });
    expect(planInstitutionalAuthoritySync({
      authorizedApplicationId: authorized.applicationId,
      source: authorized,
      sovereign: authorized,
    })).toEqual({ ok: true, action: "unchanged", binding: authorized });
    expect(agreeInstitutionalAuthority({
      source: authorized,
      sovereign: source({ sourceRevision: "2026-11-07 20:00:00+00" }),
    })).toMatchObject({ ok: true });
  });

  it("rejects missing, conflicting, stale, and mismatched authority", () => {
    const authorized = source();
    expect(planInstitutionalAuthoritySync({
      authorizedApplicationId: authorized.applicationId,
      source: null,
      sovereign: authorized,
    }).ok).toBe(false);
    expect(planInstitutionalAuthoritySync({
      authorizedApplicationId: "00000000-0000-4000-8000-000000000099",
      source: authorized,
      sovereign: null,
    })).toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
    expect(agreeInstitutionalAuthority({
      source: authorized,
      sovereign: source({ partnerId: "other-partner" }),
    })).toMatchObject({ ok: false, code: "institutional_authority_conflict" });
    expect(agreeInstitutionalAuthority({
      source: authorized,
      sovereign: source({ policyId: "other-policy" }),
    })).toMatchObject({ ok: false, code: "institutional_authority_conflict" });
    expect(agreeInstitutionalAuthority({
      source: authorized,
      sovereign: source({ policyVersion: 2 }),
    })).toMatchObject({ ok: false, code: "institutional_authority_stale" });
    expect(agreeInstitutionalAuthority({
      source: authorized,
      sovereign: source({ sourceRevision: "2026-11-06T20:00:00.000Z" }),
    })).toMatchObject({ ok: false, code: "institutional_authority_stale" });
    expect(agreeInstitutionalAuthority({
      source: authorized,
      sovereign: source({ status: "suspended" }),
    })).toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
    expect(agreeInstitutionalAuthority({
      source: source({ status: "suspended" }),
      sovereign: source({ status: "suspended" }),
    })).toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
  });

  it("rejects a challenge that no longer matches the bound policy", () => {
    const authority = source();
    expect(challengeAgreesWithAuthority({
      authority,
      challenge: {
        partnerId: authority.partnerId,
        applicationId: authority.applicationId,
        policyId: authority.policyId,
        policyVersion: authority.policyVersion,
      },
    })).toEqual({ ok: true });
    expect(challengeAgreesWithAuthority({
      authority,
      challenge: {
        partnerId: "other-partner",
        applicationId: authority.applicationId,
        policyId: authority.policyId,
        policyVersion: authority.policyVersion,
      },
    })).toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
    expect(challengeAgreesWithAuthority({
      authority,
      challenge: {
        partnerId: authority.partnerId,
        applicationId: authority.applicationId,
        policyId: authority.policyId,
        policyVersion: authority.policyVersion + 1,
      },
    })).toMatchObject({ ok: false, code: "institutional_authority_stale" });
  });
});
