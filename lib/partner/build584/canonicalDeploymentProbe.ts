// FILE: lib/partner/build584/canonicalDeploymentProbe.ts

import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";

export type RouteProbeResult = {
  path: string;
  status: number;
  reachable: boolean;
  classification: "public_html" | "public_api" | "protected_api";
};

export type CanonicalDeploymentProbeReport = {
  canonical_base_url: string;
  agent_git_sha: string;
  deployment_commit_verified: false;
  deployment_commit_note: string;
  routes: RouteProbeResult[];
  session_get_unauthenticated: { status: number; authenticated: boolean | null };
  session_post_without_key: { status: number };
  applications_unauthenticated: { status: number };
  staging_identity_endpoint: { status: number; expected_on_production: "404_not_allowed" };
};

const CANONICAL_ROUTES: Array<{ path: string; classification: RouteProbeResult["classification"] }> = [
  { path: "/developers/integration-studio", classification: "public_html" },
  { path: INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF, classification: "public_html" },
  { path: "/partner/verify", classification: "public_html" },
  { path: "/verify?mode=receipt", classification: "public_html" },
  { path: "/passport", classification: "public_html" },
];

export async function probeCanonicalDeployment(input: {
  baseUrl: string;
  agentGitSha: string;
}): Promise<CanonicalDeploymentProbeReport> {
  const base = input.baseUrl.replace(/\/$/, "");

  const routes: RouteProbeResult[] = [];
  for (const route of CANONICAL_ROUTES) {
    const res = await fetch(`${base}${route.path}`, { redirect: "manual" });
    routes.push({
      path: route.path,
      status: res.status,
      reachable: res.status >= 200 && res.status < 400,
      classification: route.classification,
    });
  }

  const sessionGet = await fetch(`${base}/api/launchpad/auth/session`, { headers: { accept: "application/json" } });
  const sessionGetBody = await sessionGet.json().catch(() => ({}));
  const sessionPost = await fetch(`${base}/api/launchpad/auth/session`, { method: "POST" });
  const apps = await fetch(`${base}/api/launchpad/applications`, { headers: { accept: "application/json" } });
  const staging = await fetch(`${base}/api/launchpad/staging/environment`, { headers: { accept: "application/json" } });

  return {
    canonical_base_url: base,
    agent_git_sha: input.agentGitSha,
    deployment_commit_verified: false,
    deployment_commit_note:
      "Production intentionally omits /api/launchpad/staging/environment. Compare Vercel production deployment SHA to agent_git_sha before claiming code parity.",
    routes,
    session_get_unauthenticated: {
      status: sessionGet.status,
      authenticated:
        sessionGetBody && typeof sessionGetBody === "object" && "authenticated" in sessionGetBody
          ? Boolean((sessionGetBody as { authenticated?: boolean }).authenticated)
          : null,
    },
    session_post_without_key: { status: sessionPost.status },
    applications_unauthenticated: { status: apps.status },
    staging_identity_endpoint: {
      status: staging.status,
      expected_on_production: "404_not_allowed",
    },
  };
}

export function canonicalProbePasses(report: CanonicalDeploymentProbeReport): boolean {
  const routesOk = report.routes.every((r) => r.reachable);
  const authBoundaryOk =
    report.session_get_unauthenticated.status === 200
    && report.session_get_unauthenticated.authenticated === false
    && report.session_post_without_key.status === 401
    && report.applications_unauthenticated.status === 401;
  const stagingOk = report.staging_identity_endpoint.status === 404;
  return routesOk && authBoundaryOk && stagingOk;
}
