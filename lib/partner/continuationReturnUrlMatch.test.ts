import { describe, expect, it } from "vitest";
import {
  decomposeContinuationReturnUrl,
  extractGoodTroubleFlowToken,
  partnerContinuationReturnUrlsMatch,
  preferAuthoritativeContinuationReturnUrl,
} from "./continuationReturnUrlMatch";

const FLOW_TOKEN = `gtf_${"a".repeat(64)}`;
const BASE = "https://www.goodtroublecanna.com/age-verification-result";

describe("partnerContinuationReturnUrlsMatch", () => {
  it("matches identical purchase callback URLs", () => {
    const url = `${BASE}?gtv=${encodeURIComponent(FLOW_TOKEN)}`;
    expect(partnerContinuationReturnUrlsMatch(url, url)).toBe(true);
  });

  it("matches encoded vs decoded gtv query values", () => {
    const encoded = `${BASE}?gtv=${encodeURIComponent(FLOW_TOKEN)}`;
    const decoded = `${BASE}?gtv=${FLOW_TOKEN}`;
    expect(partnerContinuationReturnUrlsMatch(encoded, decoded)).toBe(true);
  });

  it("rejects altered origin", () => {
    const a = `${BASE}?gtv=${FLOW_TOKEN}`;
    const b = `https://evil.example/age-verification-result?gtv=${FLOW_TOKEN}`;
    expect(partnerContinuationReturnUrlsMatch(a, b)).toBe(false);
  });

  it("rejects altered callback path", () => {
    const a = `${BASE}?gtv=${FLOW_TOKEN}`;
    const b = `https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_${"b".repeat(64)}`;
    expect(partnerContinuationReturnUrlsMatch(a, b)).toBe(false);
  });

  it("rejects altered flow token", () => {
    const a = `${BASE}?gtv=${FLOW_TOKEN}`;
    const b = `${BASE}?gtv=gtf_${"b".repeat(64)}`;
    expect(partnerContinuationReturnUrlsMatch(a, b)).toBe(false);
  });

  it("prefers stored URL when it already contains the flow token", () => {
    const stored = `${BASE}?gtv=${FLOW_TOKEN}`;
    const candidate = `${BASE}?gtv=${encodeURIComponent(FLOW_TOKEN)}`;
    expect(preferAuthoritativeContinuationReturnUrl(stored, candidate)).toBe(stored);
  });

  it("extracts gtf token from gtv param", () => {
    expect(extractGoodTroubleFlowToken(`${BASE}?gtv=${FLOW_TOKEN}`)).toBe(FLOW_TOKEN);
    expect(decomposeContinuationReturnUrl(`${BASE}?gtv=${FLOW_TOKEN}`)?.flowToken).toBe(FLOW_TOKEN);
  });
});
