import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";
import { JUDGE_DEMO_OAUTH_CALLBACK, JUDGE_DEMO_ORIGIN } from "@/lib/judgeDemo/contract";
import { GET } from "@/app/api/judge-demo/environment/route";

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
  "VERCEL_GIT_COMMIT_SHA",
] as const;

async function demoJwt(): Promise<string> {
  return new SignJWT({ ref: DEMO_SUPABASE_PROJECT_REF })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode("test-secret-for-judge-demo-jwt"));
}

describe("GET /api/judge-demo/environment", () => {
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

  it("returns 404 when Judge Demo is not enabled", async () => {
    const res = await GET(new NextRequest("http://localhost/api/judge-demo/environment"));
    expect(res.status).toBe(404);
  });

  it("proves public judge demo + DEMO bind without credentials", async () => {
    const jwt = await demoJwt();
    process.env.ABRAXAS_JUDGE_DEMO = "true";
    process.env.NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO = "true";
    process.env.ABRAXAS_RUNTIME_ENV = "demo";
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_APP_URL = JUDGE_DEMO_ORIGIN;
    process.env.ABRAXAS_ISSUER_URL = JUDGE_DEMO_ORIGIN;
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwt;
    process.env.SUPABASE_SERVICE_ROLE_KEY = jwt;
    process.env.VERCEL_GIT_COMMIT_SHA = "9a03673ea482bbaaff28b9ce56e9fe37e363eb77";

    const res = await GET(new NextRequest("https://demo.abraxasworld.xyz/api/judge-demo/environment", {
      headers: { host: "demo.abraxasworld.xyz" },
    }));
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.origin).toBe(JUDGE_DEMO_ORIGIN);
    expect(body.oauth_callback).toBe(JUDGE_DEMO_OAUTH_CALLBACK);
    expect(body.supabase_project_ref).toBe(DEMO_SUPABASE_PROJECT_REF);
    expect(body.supabase_bound_to_demo).toBe(true);
    expect(body.circle_submit_allowed).toBe(false);
    expect(body.engineering_preview_only).toBe(false);
    expect(JSON.stringify(body)).not.toContain(jwt);
    expect(JSON.stringify(body).toLowerCase()).not.toContain("service_role");
  });
});
