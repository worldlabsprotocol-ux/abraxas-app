// FILE: app/api/launchpad/staging/environment/route.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("GET /api/launchpad/staging/environment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadGet() {
    const mod = await import("./route");
    return mod.GET;
  }

  it("returns only safe fields on preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocntwbxarpjeixdnzide.supabase.co");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "37aa5f077b6b8ac896a566b39bffd26d008132c7");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-secret");

    const GET = await loadGet();
    const res = await GET(new NextRequest("http://localhost/api/launchpad/staging/environment?supabase_project_ref=evil"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      deployment_environment: "preview",
      supabase_project_ref: "ocntwbxarpjeixdnzide",
      commit_sha: "37aa5f077b6b8ac896a566b39bffd26d008132c7",
    });
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
    expect(JSON.stringify(body)).not.toContain("anon-secret");
    expect(JSON.stringify(body)).not.toContain("https://");
  });

  it("returns 404 in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocntwbxarpjeixdnzide.supabase.co");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "37aa5f077b6b8ac896a566b39bffd26d008132c7");

    const GET = await loadGet();
    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("not_found");
    expect(body.supabase_project_ref).toBeUndefined();
  });

  it("fails closed when Supabase URL is missing", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "37aa5f077b6b8ac896a566b39bffd26d008132c7");

    const GET = await loadGet();
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("staging_identity_unavailable");
    expect(body.supabase_project_ref).toBeUndefined();
  });

  it("fails closed when Supabase URL is malformed", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-valid-url");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "37aa5f077b6b8ac896a566b39bffd26d008132c7");

    const GET = await loadGet();
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("staging_identity_unavailable");
  });

  it("does not accept request parameters to override the detected ref", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocntwbxarpjeixdnzide.supabase.co");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "37aa5f077b6b8ac896a566b39bffd26d008132c7");

    const GET = await loadGet();
    const res = await GET(
      new NextRequest(
        "http://localhost/api/launchpad/staging/environment?supabase_project_ref=bztwutzprwsdrtqdpymf",
      ),
    );
    const body = await res.json();
    expect(body.supabase_project_ref).toBe("ocntwbxarpjeixdnzide");
  });
});
