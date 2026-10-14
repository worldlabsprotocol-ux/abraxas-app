// FILE: lib/sovereignRuntime/stagingHttpProbeSpec.ts
// Observed HTTP smoke probes — strict invariants (not full protocol lifecycle).

export type StagingHttpProbeId =
  | "sovereign_health"
  | "passport_evm_challenge"
  | "solana_wallet_challenge"
  | "capture_fail_closed"
  | "admin_queue_auth";

export type StagingHttpProbeSpec = {
  id: StagingHttpProbeId;
  route: string;
  method: "GET" | "POST";
  description: string;
};

export const STAGING_HTTP_SMOKE_PROBES: StagingHttpProbeSpec[] = [
  {
    id: "sovereign_health",
    route: "/api/sovereign/health",
    method: "GET",
    description: "Sovereign staging health (postgres_direct configured)",
  },
  {
    id: "passport_evm_challenge",
    route: "/api/auth/passport-evm/challenge",
    method: "POST",
    description: "Wallet auth challenge boundary (no session required)",
  },
];

export type StagingHttpProbeResult = {
  id: StagingHttpProbeId;
  route: string;
  method: string;
  status: number;
  redirect: boolean;
  contentType: string | null;
  classification: "OBSERVED_HTTP" | "UNAVAILABLE";
  ok: boolean;
  violations: string[];
  detail?: string;
};

export type StagingHttpObservationTier =
  | "OBSERVED_STAGING_HTTP"
  | "BLOCKED"
  | "FULL_PROTOCOL_LIFECYCLE_CERTIFIED";

export function evaluateStagingHttpProbe(input: {
  spec: StagingHttpProbeSpec;
  status: number;
  headers: Headers;
  bodyText: string;
  fetchError?: string;
}): StagingHttpProbeResult {
  const violations: string[] = [];
  if (input.fetchError) {
    return {
      id: input.spec.id,
      route: input.spec.route,
      method: input.spec.method,
      status: 0,
      redirect: false,
      contentType: null,
      classification: "UNAVAILABLE",
      ok: false,
      violations: ["fetch_failed"],
      detail: input.fetchError,
    };
  }

  const location = input.headers.get("location");
  const redirect = input.status >= 300 && input.status < 400;
  if (redirect) {
    violations.push(`unexpected_redirect_${input.status}`);
  }

  const contentType = input.headers.get("content-type");
  const json = contentType?.includes("application/json") ?? false;
  if (!json) {
    violations.push("expected_json_content_type");
  }

  let parsed: unknown = null;
  if (json && input.bodyText) {
    try {
      parsed = JSON.parse(input.bodyText);
    } catch {
      violations.push("invalid_json_body");
    }
  }

  const body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;

  if (input.spec.id === "sovereign_health") {
    if (input.status !== 200) violations.push(`expected_status_200_got_${input.status}`);
    if (body?.build !== 558) violations.push("expected_build_558");
    if (body?.tier !== "STAGING_READY") violations.push(`expected_tier_STAGING_READY_got_${String(body?.tier)}`);
    if (body?.authorization_default !== "deny_unavailable") {
      violations.push("expected_authorization_default_deny_unavailable");
    }
  }

  if (input.spec.id === "passport_evm_challenge") {
    const allowed = new Set([200, 400, 403, 503]);
    if (!allowed.has(input.status)) {
      violations.push(`unexpected_status_${input.status}`);
    }
    if (input.status === 401) violations.push("authentication_required_unexpected");
    if (input.status === 404) violations.push("route_not_found");
    if (body && typeof body.ok !== "boolean") violations.push("expected_ok_boolean");
    if (input.status === 200 && body?.ok === true && !body.challenge) {
      violations.push("expected_challenge_on_success");
    }
    if (location && !input.spec.route.startsWith("/api/")) {
      violations.push("unexpected_location_header");
    }
  }

  const ok = violations.length === 0;
  return {
    id: input.spec.id,
    route: input.spec.route,
    method: input.spec.method,
    status: input.status,
    redirect,
    contentType,
    classification: "OBSERVED_HTTP",
    ok,
    violations,
  };
}

export function summarizeStagingHttpTier(results: StagingHttpProbeResult[]): {
  tier: StagingHttpObservationTier;
  full_protocol_lifecycle_certified: false;
} {
  const allOk = results.length > 0 && results.every((r) => r.ok && r.classification === "OBSERVED_HTTP");
  return {
    tier: allOk ? "OBSERVED_STAGING_HTTP" : "BLOCKED",
    full_protocol_lifecycle_certified: false,
  };
}
