import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import {
  DEMO_OAUTH_CALLBACK,
  OBSOLETE_JUDGE_DEMO_ENV_NAMES,
  DemoRuntimeUnavailableError,
  assertDemoRuntimeBoot,
  evaluateDemoRuntime,
  isPublicDemoRuntime,
} from "@/lib/product/demoRuntime";

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
] as const;

async function demoJwt(): Promise<string> {
  return new SignJWT({ ref: DEMO_SUPABASE_PROJECT_REF })
    .setProtectedHeader({ alg: "HS256", ref: DEMO_SUPABASE_PROJECT_REF })
    .sign(new TextEncoder().encode("test-secret-for-demo-runtime-jwt"));
}

describe("DEMO runtime binding", () => {
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

  it("is inactive without a DEMO origin or runtime marker, even if obsolete judge flags are set", () => {
    process.env.ABRAXAS_JUDGE_DEMO = "true";
    process.env.NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO = "true";
    expect(isPublicDemoRuntime()).toBe(false);
    const evaluation = evaluateDemoRuntime();
    expect(evaluation.bound).toBe(false);
    expect(evaluation.ok).toBe(false);
    expect(() => assertDemoRuntimeBoot()).not.toThrow();
    expect(OBSOLETE_JUDGE_DEMO_ENV_NAMES).toContain("ABRAXAS_JUDGE_DEMO");
  });

  it("binds from DEMO origin and isolated data without a judge flag", async () => {
    const jwt = await demoJwt();
    const env = {
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_APP_URL: PUBLIC_DEMO_ORIGIN,
      ABRAXAS_ISSUER_URL: PUBLIC_DEMO_ORIGIN,
      NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt,
      SUPABASE_SERVICE_ROLE_KEY: jwt,
    };
    const request = new Request("https://demo.abraxasworld.xyz/", {
      headers: { host: "demo.abraxasworld.xyz" },
    });
    const evaluation = evaluateDemoRuntime({ env, request });
    expect(evaluation.ok).toBe(true);
    expect(evaluation.oauth_callback).toBe(DEMO_OAUTH_CALLBACK);
    expect(evaluation.circle_requires_explicit_confirmation).toBe(true);
    expect(() => assertDemoRuntimeBoot(env)).not.toThrow();
  });

  it("allows isolated DEMO when key JWTs omit a project ref but the URL is DEMO", async () => {
    const jwt = await new SignJWT({ role: "anon" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("test-secret-for-demo-runtime-jwt"));
    const env = {
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_APP_URL: `${PUBLIC_DEMO_ORIGIN}/`,
      NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt,
      SUPABASE_SERVICE_ROLE_KEY: jwt,
    };
    expect(evaluateDemoRuntime({ env }).ok).toBe(true);
    expect(() => assertDemoRuntimeBoot(env)).not.toThrow();
  });

  it("allows isolated DEMO on a Vercel production alias", async () => {
    const jwt = await demoJwt();
    const env = {
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: PUBLIC_DEMO_ORIGIN,
      ABRAXAS_ISSUER_URL: PUBLIC_DEMO_ORIGIN,
      NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt,
      SUPABASE_SERVICE_ROLE_KEY: jwt,
    };
    const evaluation = evaluateDemoRuntime({ env });
    expect(evaluation.ok).toBe(true);
    expect(evaluation.fail_codes).not.toContain("demo_production_vercel");
    expect(() => assertDemoRuntimeBoot(env)).not.toThrow();
  });

  it("fails closed when DEMO runtime is bound to production data", async () => {
    const env = {
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://abraxasworld.xyz",
      NEXT_PUBLIC_SUPABASE_URL: "https://bztwutzprwsdrtqdpymf.supabase.co",
      CIRCLE_API_KEY: "LIVE_API_KEY:blocked",
    };
    const evaluation = evaluateDemoRuntime({ env });
    expect(evaluation.ok).toBe(false);
    expect(evaluation.fail_codes).toEqual(expect.arrayContaining([
      "demo_origin_mismatch",
      "demo_production_vercel",
      "demo_production_supabase",
      "demo_live_circle_credentials",
    ]));
    expect(() => assertDemoRuntimeBoot(env)).toThrow(DemoRuntimeUnavailableError);
    try {
      assertDemoRuntimeBoot(env);
    } catch (error) {
      expect(error).toBeInstanceOf(DemoRuntimeUnavailableError);
      expect((error as DemoRuntimeUnavailableError).fail_codes).toEqual(evaluation.fail_codes);
      expect(JSON.stringify(error)).not.toMatch(/eyJ|service_role|bztwutzprwsdrtqdpymf/);
    }
  });
});
