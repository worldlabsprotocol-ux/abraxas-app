// @vitest-environment jsdom
// FILE: lib/partner/partnerVerifyResume.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildPartnerVerifyPath,
  clearPartnerVerifyResume,
  consumePartnerVerifyResumePath,
  isRestorablePartnerVerifyPath,
  loadPartnerVerifyResume,
  parsePartnerVerifyResumeParams,
  peekPartnerVerifyResumePath,
  savePartnerVerifyResume,
} from "./partnerVerifyResume";

const SAMPLE = {
  partnerId: "good-trouble-cannabis",
  policyId: "good-trouble-retail-v1",
  returnUrl: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_abc123",
};

describe("partnerVerifyResume", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    clearPartnerVerifyResume();
  });

  it("builds partner verify path with required query params", () => {
    const path = buildPartnerVerifyPath(SAMPLE);
    expect(path).toMatch(/^\/partner\/verify\?/);
    expect(path).toContain("partner_id=good-trouble-cannabis");
    expect(path).toContain("policy_id=good-trouble-retail-v1");
    expect(path).toContain(encodeURIComponent(SAMPLE.returnUrl));
    expect(isRestorablePartnerVerifyPath(path)).toBe(true);
  });

  it("parses resume params from search params", () => {
    const params = new URLSearchParams({
      partner_id: SAMPLE.partnerId,
      policy_id: SAMPLE.policyId,
      return_url: SAMPLE.returnUrl,
    });
    expect(parsePartnerVerifyResumeParams(params)).toEqual(SAMPLE);
  });

  it("rejects incomplete partner verify links", () => {
    const params = new URLSearchParams({
      partner_id: SAMPLE.partnerId,
      return_url: SAMPLE.returnUrl,
    });
    expect(parsePartnerVerifyResumeParams(params)).toBeNull();
  });

  it("saves and consumes resume path preserving gtv flow id", () => {
    savePartnerVerifyResume(SAMPLE);
    const loaded = loadPartnerVerifyResume();
    expect(loaded?.returnUrl).toContain("gtv=gtv_abc123");
    expect(loaded?.partnerId).toBe(SAMPLE.partnerId);
    expect(loaded?.policyId).toBe(SAMPLE.policyId);

    const path = consumePartnerVerifyResumePath();
    expect(path).toContain(encodeURIComponent(SAMPLE.returnUrl));
    expect(loadPartnerVerifyResume()).toBeNull();
  });

  it("peeks without consuming resume state", () => {
    savePartnerVerifyResume(SAMPLE);
    expect(peekPartnerVerifyResumePath()).toContain("/partner/verify?");
    expect(loadPartnerVerifyResume()).not.toBeNull();
  });

  it("expires stale resume state and clears storage", () => {
    sessionStorage.setItem(
      "abraxas_partner_verify_resume_v1",
      JSON.stringify({
        ...SAMPLE,
        savedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      }),
    );
    expect(loadPartnerVerifyResume()).toBeNull();
    expect(sessionStorage.getItem("abraxas_partner_verify_resume_v1")).toBeNull();
  });

  it("rejects non-restorable paths", () => {
    expect(isRestorablePartnerVerifyPath("/passport")).toBe(false);
    expect(isRestorablePartnerVerifyPath("//evil.example/partner/verify?x=1")).toBe(false);
    expect(isRestorablePartnerVerifyPath("https://abraxasworld.xyz/partner/verify?x=1")).toBe(false);
    expect(isRestorablePartnerVerifyPath("/partner/verify\\?x=1")).toBe(false);
    expect(isRestorablePartnerVerifyPath("/partner/verify/../admin")).toBe(false);
    expect(isRestorablePartnerVerifyPath("/partner/verify?partner_id=a&return_url=b#frag")).toBe(false);
  });

  it("refuses to save resume state with forbidden fields", () => {
    sessionStorage.setItem(
      "abraxas_partner_verify_resume_v1",
      JSON.stringify({
        ...SAMPLE,
        savedAt: new Date().toISOString(),
        id_token: "secret-token",
      }),
    );
    expect(loadPartnerVerifyResume()).toBeNull();
    expect(sessionStorage.getItem("abraxas_partner_verify_resume_v1")).toBeNull();
  });

  it("clears invalid resume state on malformed JSON", () => {
    sessionStorage.setItem("abraxas_partner_verify_resume_v1", "{not-json");
    expect(loadPartnerVerifyResume()).toBeNull();
    expect(sessionStorage.getItem("abraxas_partner_verify_resume_v1")).toBeNull();
  });

  it("rejects unsafe return_url values in resume state", () => {
    sessionStorage.setItem(
      "abraxas_partner_verify_resume_v1",
      JSON.stringify({
        partnerId: "good-trouble-cannabis",
        policyId: "good-trouble-retail-v1",
        returnUrl: "javascript:alert(1)",
        savedAt: new Date().toISOString(),
      }),
    );
    expect(loadPartnerVerifyResume()).toBeNull();
    expect(consumePartnerVerifyResumePath()).toBeNull();
    expect(sessionStorage.getItem("abraxas_partner_verify_resume_v1")).toBeNull();
  });
});
