import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const DEMO = "ocntwbxarpjeixdnzide";

function demoJwt(ref: string, role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ref, role })).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("GET /api/preview/supabase-binding", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 JSON in production without key material", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${DEMO}.supabase.co`);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", demoJwt(DEMO, "anon"));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", demoJwt(DEMO, "service_role"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("preview_binding_probe_unavailable");
    expect(JSON.stringify(body)).not.toMatch(/eyJ/);
    expect(JSON.stringify(body)).not.toContain("anon_key");
    expect(JSON.stringify(body)).not.toContain("service_role");
  });

  it("returns project refs only on preview with Cache-Control no-store", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "9a644873fea41be525f9c136342417be5cb68815");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${DEMO}.supabase.co`);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", demoJwt(DEMO, "anon"));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", demoJwt(DEMO, "service_role"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body.url_project_ref).toBe(DEMO);
    expect(body.anon_key_project_ref).toBe(DEMO);
    expect(body.service_role_key_project_ref).toBe(DEMO);
    expect(body.all_match_demo).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/eyJ/);
    expect(JSON.stringify(body)).not.toContain(demoJwt(DEMO, "anon"));
  });
});
