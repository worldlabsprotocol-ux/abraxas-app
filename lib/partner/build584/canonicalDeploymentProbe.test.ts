// FILE: lib/partner/build584/canonicalDeploymentProbe.test.ts

import { describe, expect, it, vi, afterEach } from "vitest";
import { canonicalProbePasses, probeCanonicalDeployment } from "@/lib/partner/build584/canonicalDeploymentProbe";

describe("canonicalDeploymentProbe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("classifies reachable public routes and auth boundaries", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/launchpad/auth/session")) {
        if (init?.method === "POST") {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        return new Response(JSON.stringify({ ok: false, authenticated: false }), { status: 200 });
      }
      if (url.includes("/api/launchpad/applications")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
      if (url.includes("/api/launchpad/staging/environment")) {
        return new Response(JSON.stringify({ ok: false, code: "not_found" }), { status: 404 });
      }
      return new Response("<html>ok</html>", { status: 200, headers: { "content-type": "text/html" } });
    }));

    const report = await probeCanonicalDeployment({
      baseUrl: "https://example.test",
      agentGitSha: "abc1234",
    });
    expect(canonicalProbePasses(report)).toBe(true);
    expect(report.routes.every((r) => r.reachable)).toBe(true);
  });
});
