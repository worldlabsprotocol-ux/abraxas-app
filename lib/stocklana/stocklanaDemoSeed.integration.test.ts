// FILE: lib/stocklana/stocklanaDemoSeed.integration.test.ts
// Contract checks for Stocklana DEMO seed + PR #292 preview callback allowlist.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isPartnerReturnUrlAllowlisted } from "@/lib/connect/returnUrlAllowlistSemantics";
import { stocklanaReturnUrl, stocklanaVerifyUrl } from "@/lib/stocklana/partnerIntegration";
import {
  STOCKLANA_CALLBACK_PATH,
  STOCKLANA_ELIGIBILITY_POLICY_ID,
  STOCKLANA_PARTNER_ID,
} from "@/lib/stocklana/constants";
import { STOCKLANA_ELIGIBILITY_POLICY_RULES } from "@/lib/stocklana/eligibilityPolicy";

const PR_292_PREVIEW_ORIGIN =
  "https://abraxas-app-git-cursor-st-21cf4b-worldlabsprotocol-uxs-projects.vercel.app";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/087_stocklana_pilot.sql",
);

const PR_292_PREVIEW_CALLBACK =
  `${PR_292_PREVIEW_ORIGIN}${STOCKLANA_CALLBACK_PATH}`;

function extractAllowlistedReturnUrls(sql: string): string[] {
  return [...sql.matchAll(/'(https?:\/\/[^']+)'/g)]
    .map((m) => m[1])
    .filter((url) => url.includes(STOCKLANA_CALLBACK_PATH));
}

describe("Stocklana DEMO seed integration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");
  const allowlisted = extractAllowlistedReturnUrls(migrationSql);

  it("migration allowlists PR #292 preview callback for stocklana-demo", () => {
    expect(allowlisted).toContain(PR_292_PREVIEW_CALLBACK);
    expect(
      isPartnerReturnUrlAllowlisted(allowlisted, PR_292_PREVIEW_CALLBACK),
    ).toBe(true);
  });

  it("hosted verify URL uses allowlisted callback with asset context", () => {
    const callback = stocklanaReturnUrl(PR_292_PREVIEW_ORIGIN, "openai-prestocks");
    expect(isPartnerReturnUrlAllowlisted(allowlisted, callback)).toBe(true);

    const verify = new URL(stocklanaVerifyUrl(PR_292_PREVIEW_ORIGIN, "openai-prestocks"));
    expect(verify.pathname).toBe("/partner/verify");
    expect(verify.searchParams.get("partner_id")).toBe(STOCKLANA_PARTNER_ID);
    expect(verify.searchParams.get("policy_id")).toBe(STOCKLANA_ELIGIBILITY_POLICY_ID);
    expect(verify.searchParams.get("return_url")).toBe(callback);
  });

  it("policy rules in code match migration blocked_jurisdictions contract", () => {
    expect(STOCKLANA_ELIGIBILITY_POLICY_RULES.blocked_jurisdictions).toEqual(["US"]);
    expect(migrationSql).toContain('"blocked_jurisdictions": ["US"]');
  });
});
