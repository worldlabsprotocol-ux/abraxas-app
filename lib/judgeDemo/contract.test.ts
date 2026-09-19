import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";
import {
  JUDGE_DEMO_OAUTH_CALLBACK,
  JUDGE_DEMO_ORIGIN,
  assertJudgeDemoBootContract,
  evaluateJudgeDemoContract,
  judgeDemoIdentityHasForbiddenMaterial,
  toPublicJudgeDemoIdentity,
} from "@/lib/judgeDemo/contract";

const KEYS = [
  "ABRAXAS_JUDGE_DEMO",
  "NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO",
  "ABRAXAS_RUNTIME_ENV",
  "VERCEL_ENV",
  "NEXT_PUBLIC_APP_URL",
  "ABRAXAS_ISSUER_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CIRCLE_API_KEY",
  "VERCEL_GIT_COMMIT_SHA",
] as const;

async function demoJwt(): Promise<string> {
  return new SignJWT({ ref: DEMO_SUPABASE_PROJECT_REF })
    .setProtectedHeader({ alg: "HS256", ref: DEMO_SUPABASE_PROJECT_REF })
    .sign(new TextEncoder().encode("test-secret-for-judge-demo-jwt"));
}

async function productionJwt(): Promise<string> {
  return new SignJWT({ ref: "bztwutzprwsdrtqdpymf" })
    .setProtectedHeader({ alg: "HS256", ref: "bztwutzprwsdrtqdpymf" })
    .sign(new TextEncoder().encode("test-secret-for-judge-demo-jwt"));
}

describe("Judge Demo runtime contract", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("is inactive when the judge-demo flags are unset", () => {
    const evaluation = evaluateJudgeDemoContract();
    expect(evaluation.requested).toBe(false);
    expect(evaluation.ok).toBe(false);
    expect(evaluation.fail_codes).toContain("judge_demo_not_enabled");
    expect(() => assertJudgeDemoBootContract()).not.toThrow();
  });

  it("passes when origin, DEMO ref, and non-production runtime marker are exact", async () => {
    const jwt = await demoJwt();
    const env = {
      ABRAXAS_JUDGE_DEMO: "true",
      NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO: "true",
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_APP_URL: JUDGE_DEMO_ORIGIN,
      ABRAXAS_ISSUER_URL: JUDGE_DEMO_ORIGIN,
      NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt,
      SUPABASE_SERVICE_ROLE_KEY: jwt,
      VERCEL_GIT_COMMIT_SHA: "abc123",
    };
    const request = new Request("https://demo.abraxasworld.xyz/api/judge-demo/environment", {
      headers: { host: "demo.abraxasworld.xyz" },
    });
    const evaluation = evaluateJudgeDemoContract({ env, request });
    expect(evaluation.ok).toBe(true);
    expect(evaluation.oauth_callback).toBe(JUDGE_DEMO_OAUTH_CALLBACK);
    expect(evaluation.circle_submit_allowed).toBe(false);
    expect(evaluation.engineering_preview_only).toBe(false);
    const publicIdentity = toPublicJudgeDemoIdentity(evaluation);
    expect(judgeDemoIdentityHasForbiddenMaterial(publicIdentity)).toBe(false);
    expect(JSON.stringify(publicIdentity)).not.toContain(jwt.slice(0, 12));
    expect(() => assertJudgeDemoBootContract(env)).not.toThrow();
  });

  it("fails closed on Production Supabase, production runtime, or unexpected host", async () => {
    const prodJwt = await productionJwt();
    const env = {
      ABRAXAS_JUDGE_DEMO: "true",
      NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO: "true",
      ABRAXAS_RUNTIME_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://abraxasworld.xyz",
      NEXT_PUBLIC_SUPABASE_URL: "https://bztwutzprwsdrtqdpymf.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: prodJwt,
      SUPABASE_SERVICE_ROLE_KEY: prodJwt,
      CIRCLE_API_KEY: "LIVE_API_KEY:blocked",
    };
    const request = new Request("https://abraxas-app-git-preview.vercel.app/", {
      headers: { host: "abraxas-app-git-preview.vercel.app" },
    });
    const evaluation = evaluateJudgeDemoContract({ env, request });
    expect(evaluation.ok).toBe(false);
    expect(evaluation.fail_codes).toEqual(expect.arrayContaining([
      "judge_demo_origin_mismatch",
      "judge_demo_unexpected_host",
      "judge_demo_runtime_not_demo",
      "judge_demo_production_runtime",
      "judge_demo_production_vercel",
      "judge_demo_production_supabase",
      "judge_demo_supabase_not_demo",
      "judge_demo_live_circle_credentials",
    ]));
    expect(() => assertJudgeDemoBootContract(env)).toThrow(/failed closed/);
  });
});
