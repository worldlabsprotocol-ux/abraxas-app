// FILE: lib/sovereignRuntime/stagingLifecycleHttpProbes.ts
// Observed HTTP lifecycle boundary probes (unauthenticated / fail-closed checks only).

import {
  evaluateStagingHttpProbe,
  STAGING_HTTP_SMOKE_PROBES,
  type StagingHttpProbeResult,
} from "./stagingHttpProbeSpec";

export type LifecycleHttpProbeSpec = {
  id: string;
  lifecycle_step: string;
  route: string;
  method: "GET" | "POST";
  note: string;
};

/** Maps protocol lifecycle stages to HTTP routes that can be observed without synthetic DB fixtures. */
export const STAGING_LIFECYCLE_HTTP_PROBES: LifecycleHttpProbeSpec[] = [
  ...STAGING_HTTP_SMOKE_PROBES.map((p) => ({
    id: p.id,
    lifecycle_step:
      p.id === "sovereign_health"
        ? "monitoring_health"
        : "wallet_authentication_challenge",
    route: p.route,
    method: p.method,
    note: p.description,
  })),
  {
    id: "evm_wallet_challenge",
    lifecycle_step: "evm_wallet_authentication",
    route: "/api/auth/passport-evm/challenge",
    method: "POST",
    note: "EVM wallet challenge issuance",
  },
  {
    id: "solana_wallet_challenge",
    lifecycle_step: "solana_wallet_authentication",
    route: "/api/auth/passport-solana/challenge",
    method: "POST",
    note: "Solana wallet challenge issuance",
  },
  {
    id: "capture_fail_closed",
    lifecycle_step: "encrypted_capture_boundary",
    route: "/api/identity/documents/capture",
    method: "POST",
    note: "Capture must reject unauthenticated requests (fail closed)",
  },
  {
    id: "admin_queue_auth",
    lifecycle_step: "admin_review_authentication",
    route: "/api/admin/identity/queue",
    method: "GET",
    note: "Admin review requires authentication in production mode",
  },
];

export type LifecycleHttpProbeResult = StagingHttpProbeResult & {
  lifecycle_step: string;
};

function evaluateCaptureProbe(status: number, headers: Headers, bodyText: string): LifecycleHttpProbeResult {
  const violations: string[] = [];
  if (status === 404) violations.push("route_not_found");
  if (status >= 300 && status < 400) violations.push(`unexpected_redirect_${status}`);
  if (status === 200) violations.push("unauthenticated_capture_must_not_succeed");
  const allowed = status >= 400 && status < 500;
  if (!allowed) violations.push(`expected_4xx_got_${status}`);
  const json = headers.get("content-type")?.includes("application/json");
  if (!json && status !== 0) violations.push("expected_json_error_body");
  return {
    id: "capture_fail_closed",
    route: "/api/identity/documents/capture",
    method: "POST",
    lifecycle_step: "encrypted_capture_boundary",
    status,
    redirect: status >= 300 && status < 400,
    contentType: headers.get("content-type"),
    classification: "OBSERVED_HTTP",
    ok: violations.length === 0,
    violations,
  };
}

function evaluateAdminQueueProbe(status: number, headers: Headers): LifecycleHttpProbeResult {
  const violations: string[] = [];
  if (status === 404) violations.push("route_not_found");
  if (status >= 300 && status < 400) violations.push(`unexpected_redirect_${status}`);
  if (status === 200) violations.push("unauthenticated_admin_queue_must_not_succeed");
  if (status !== 401 && status !== 403) violations.push(`expected_401_or_403_got_${status}`);
  return {
    id: "admin_queue_auth",
    route: "/api/admin/identity/queue",
    method: "GET",
    lifecycle_step: "admin_review_authentication",
    status,
    redirect: status >= 300 && status < 400,
    contentType: headers.get("content-type"),
    classification: "OBSERVED_HTTP",
    ok: violations.length === 0,
    violations,
  };
}

export async function runStagingLifecycleHttpProbes(
  baseUrl: string,
  wallet = "0x0000000000000000000000000000000000000001",
): Promise<LifecycleHttpProbeResult[]> {
  const base = baseUrl.replace(/\/$/, "");
  const results: LifecycleHttpProbeResult[] = [];

  for (const spec of STAGING_HTTP_SMOKE_PROBES) {
    const url = `${base}${spec.route}`;
    try {
      const init: RequestInit =
        spec.method === "POST"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json", Origin: base },
              body: JSON.stringify({
                wallet_address: wallet,
                chain_id: 11155111,
                intended_action: "passport_sign_in",
              }),
              redirect: "manual",
            }
          : { method: "GET", redirect: "manual" };
      const res = await fetch(url, init);
      const bodyText = await res.text();
      const evaluated = evaluateStagingHttpProbe({
        spec,
        status: res.status,
        headers: res.headers,
        bodyText,
      });
      results.push({ ...evaluated, lifecycle_step: spec.id === "sovereign_health" ? "monitoring_health" : "wallet_authentication_challenge" });
    } catch (error) {
      results.push({
        id: spec.id,
        route: spec.route,
        method: spec.method,
        lifecycle_step: "monitoring_health",
        status: 0,
        redirect: false,
        contentType: null,
        classification: "UNAVAILABLE",
        ok: false,
        violations: ["fetch_failed"],
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Solana challenge
  try {
    const res = await fetch(`${base}/api/auth/passport-solana/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({
        wallet_address: "11111111111111111111111111111111",
        solana_network: "devnet",
        intended_action: "passport_sign_in",
      }),
      redirect: "manual",
    });
    const bodyText = await res.text();
    const evaluated = evaluateStagingHttpProbe({
      spec: {
        id: "passport_evm_challenge",
        route: "/api/auth/passport-solana/challenge",
        method: "POST",
        description: "Solana challenge",
      },
      status: res.status,
      headers: res.headers,
      bodyText,
    });
    results.push({ ...evaluated, id: "solana_wallet_challenge", lifecycle_step: "solana_wallet_authentication" });
  } catch (error) {
    results.push({
      id: "solana_wallet_challenge",
      route: "/api/auth/passport-solana/challenge",
      method: "POST",
      lifecycle_step: "solana_wallet_authentication",
      status: 0,
      classification: "UNAVAILABLE",
      ok: false,
      violations: ["fetch_failed"],
      redirect: false,
      contentType: null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // Capture fail-closed
  try {
    const form = new FormData();
    form.set("holder_subject_id", "abx_hs_aabbccddeeff00112233445566778899");
    form.set("consent", "1");
    const res = await fetch(`${base}/api/identity/documents/capture`, {
      method: "POST",
      body: form,
      redirect: "manual",
    });
    results.push(evaluateCaptureProbe(res.status, res.headers, await res.text()));
  } catch (error) {
    results.push({
      id: "capture_fail_closed",
      route: "/api/identity/documents/capture",
      method: "POST",
      lifecycle_step: "encrypted_capture_boundary",
      status: 0,
      classification: "UNAVAILABLE",
      ok: false,
      violations: ["fetch_failed"],
      redirect: false,
      contentType: null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const res = await fetch(`${base}/api/admin/identity/queue`, { method: "GET", redirect: "manual" });
    results.push(evaluateAdminQueueProbe(res.status, res.headers));
  } catch (error) {
    results.push({
      id: "admin_queue_auth",
      route: "/api/admin/identity/queue",
      method: "GET",
      lifecycle_step: "admin_review_authentication",
      status: 0,
      classification: "UNAVAILABLE",
      ok: false,
      violations: ["fetch_failed"],
      redirect: false,
      contentType: null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

export function lifecycleHttpObservedOk(results: LifecycleHttpProbeResult[]): boolean {
  return results.length > 0 && results.every((r) => r.ok && r.classification === "OBSERVED_HTTP");
}
