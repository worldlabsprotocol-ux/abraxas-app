// FILE: app/api/public/deployment/route.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/public/deployment", () => {
  it("returns Vercel git commit sha when set", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "89279b1c886c279b392536bf6f4dba3d7deab590");
    vi.stubEnv("VERCEL_ENV", "production");
    const res = await GET();
    const json = (await res.json()) as { git_commit_sha: string; vercel_env: string };
    expect(json.git_commit_sha).toBe("89279b1c886c279b392536bf6f4dba3d7deab590");
    expect(json.vercel_env).toBe("production");
  });
});