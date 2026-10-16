// FILE: lib/partner/build584/liveInstitutionalHttpJourney.ts

import { INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { LiveLaunchpadHttpClient } from "@/lib/partner/build584/httpClient";
import { runInstitutionalIndependentVerifierMatrix } from "@/lib/partner/build584/independentVerifierSteps";

export type LiveStepResult = {
  step: string;
  status: "pass" | "fail" | "blocked" | "skipped";
  detail: string;
};

function jsonField(body: unknown, path: string): unknown {
  if (!body || typeof body !== "object") return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, body);
}

export async function runLiveInstitutionalHttpJourney(env: NodeJS.ProcessEnv = process.env): Promise<LiveStepResult[]> {
  const base = (env.BUILD584_SANDBOX_BASE_URL ?? env.BUILD583_SANDBOX_BASE_URL ?? "https://abraxasworld.xyz")
    .trim()
    .replace(/\/$/, "");
  const apiKey = (env.BUILD584_PARTNER_API_KEY ?? env.BUILD583_PARTNER_API_KEY)?.trim();
  const applicationId = (env.BUILD584_APPLICATION_ID ?? env.BUILD583_APPLICATION_ID)?.trim();

  if (!apiKey) {
    return [{
      step: "partner_credentials",
      status: "blocked",
      detail:
        "Set BUILD584_PARTNER_API_KEY (sandbox abx_test_… from Launchpad) on the operator machine. Never commit or log the key.",
    }];
  }

  const client = new LiveLaunchpadHttpClient(base);
  const steps: LiveStepResult[] = [];

  const sessionPost = await client.request("/api/launchpad/auth/session", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!sessionPost.ok) {
    steps.push({
      step: "partner_session_post",
      status: "fail",
      detail: `HTTP ${sessionPost.status} — verify key prefix abx_test_, partner status, and ABRAXAS_BROWSER_SESSION_SECRET on the deployment.`,
    });
    return steps;
  }
  if (!client.cookieHeader.includes("abraxas_partner_console_session")) {
    steps.push({
      step: "partner_session_cookie",
      status: "fail",
      detail: "Session accepted but partner console cookie was not issued.",
    });
    return steps;
  }
  steps.push({ step: "partner_session_post", status: "pass", detail: "Sandbox API key authenticated." });

  const sessionGet = await client.request("/api/launchpad/auth/session");
  const authenticated = jsonField(sessionGet.body, "authenticated") === true;
  steps.push({
    step: "partner_session_get",
    status: sessionGet.ok && authenticated ? "pass" : "fail",
    detail: authenticated ? "Session cookie round-trip succeeded." : "Session not authenticated after POST.",
  });

  if (!applicationId) {
    steps.push({
      step: "sandbox_application_resolve",
      status: "blocked",
      detail: "Set BUILD584_APPLICATION_ID to the institutional sandbox application UUID from Launchpad.",
    });
    steps.push({
      step: "hosted_holder_authorization",
      status: "blocked",
      detail: "Complete hosted holder authorization in browser after partner session is available.",
    });
    return steps;
  }

  const appRes = await client.request(`/api/launchpad/applications/${applicationId}`);
  const app = jsonField(appRes.body, "application") as Record<string, unknown> | undefined;
  if (!appRes.ok || !app) {
    steps.push({
      step: "sandbox_application_resolve",
      status: "fail",
      detail: `HTTP ${appRes.status} — application not found for this partner session.`,
    });
    return steps;
  }
  steps.push({ step: "sandbox_application_resolve", status: "pass", detail: String(app.id ?? applicationId) });

  const policyTemplate = String(app.policy_template_id ?? "");
  const policyId = String(app.policy_id ?? "");
  const partnerId = String(app.partner_id ?? jsonField(sessionGet.body, "partner_id") ?? "");
  const policyPinned = policyTemplate === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID
    && policyId === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;
  steps.push({
    step: "pinned_institutional_policy",
    status: policyPinned ? "pass" : "fail",
    detail: policyPinned
      ? "sandbox_institutional_protocol_access pinned."
      : `Expected institutional template; got template=${policyTemplate} policy=${policyId}`,
  });

  const returnUrls = await client.request(`/api/launchpad/applications/${applicationId}/return-urls`);
  const allowed = jsonField(returnUrls.body, "allowed_return_urls");
  const hasCallback = Array.isArray(allowed) && allowed.length > 0;
  steps.push({
    step: "callback_configuration",
    status: returnUrls.ok && hasCallback ? "pass" : "blocked",
    detail: hasCallback
      ? `${(allowed as string[]).length} allowlisted return URL(s).`
      : "Add at least one HTTPS or localhost callback in Launchpad Connect step.",
  });

  const flowReq = await client.request(`/api/launchpad/applications/${applicationId}/partner-flow-request`);
  steps.push({
    step: "partner_flow_request",
    status: flowReq.ok ? "pass" : "blocked",
    detail: flowReq.ok ? "Partner flow configuration readable." : `HTTP ${flowReq.status} — complete integration kit / flow config.`,
  });

  const tenantProbe = await client.request(
    `/api/launchpad/applications/${applicationId}/partner-flow-request?partner_id=foreign-partner-id`,
  );
  steps.push({
    step: "tenant_isolation_partner_context",
    status: tenantProbe.status === 403 ? "pass" : "fail",
    detail: tenantProbe.status === 403
      ? "Foreign partner_id rejected."
      : `Expected 403 for cross-tenant partner_id; got ${tenantProbe.status}.`,
  });

  const healthBefore = await client.request(`/api/launchpad/applications/${applicationId}/integration-health`);
  steps.push({
    step: "integration_health_before",
    status: healthBefore.ok ? "pass" : "fail",
    detail: healthBefore.ok ? "Activation evidence endpoint reachable." : `HTTP ${healthBefore.status}`,
  });

  const returnUrl = hasCallback ? String((allowed as string[])[0]) : "";
  const testPost = await client.request(`/api/launchpad/applications/${applicationId}/test`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario_id: "approved", return_url: returnUrl || undefined }),
  });
  const testPassed = jsonField(testPost.body, "result.passed") === true;
  steps.push({
    step: "verification_request_harness",
    status: testPost.ok && testPassed ? "pass" : testPost.ok ? "fail" : "blocked",
    detail: testPost.ok
      ? testPassed
        ? "Launchpad approved harness scenario passed (signed receipt trust path)."
        : "Harness scenario returned without pass — check signing configuration."
      : `HTTP ${testPost.status} — configure return URL and sandbox key before test verification.`,
  });

  const hostedUrl = jsonField(testPost.body, "result.hosted_verify_url");
  steps.push({
    step: "hosted_verification_url",
    status: typeof hostedUrl === "string" && hostedUrl.includes("/partner/verify") ? "pass" : "blocked",
    detail: typeof hostedUrl === "string"
      ? "Hosted verification URL issued (holder must complete consent in browser)."
      : "Hosted URL unavailable until harness test succeeds.",
  });

  steps.push({
    step: "hosted_holder_authorization",
    status: "blocked",
    detail:
      "Requires a permitted sandbox holder session through /partner/verify. Run npm run build-584:authenticated-browser-acceptance with BUILD584_PARTNER_API_KEY or complete manually and attach Playwright evidence.",
  });

  const healthAfter = await client.request(`/api/launchpad/applications/${applicationId}/integration-health`);
  const successes = jsonField(healthAfter.body, "verification_successes");
  steps.push({
    step: "integration_health_after_test",
    status: healthAfter.ok ? "pass" : "fail",
    detail: healthAfter.ok
      ? `verification_successes=${typeof successes === "number" ? successes : "unknown"}`
      : `HTTP ${healthAfter.status}`,
  });

  const timeline = await client.request(`/api/launchpad/applications/${applicationId}/integration-timeline`);
  steps.push({
    step: "integration_timeline",
    status: timeline.ok ? "pass" : "skipped",
    detail: timeline.ok ? "Durable integration events exportable." : `HTTP ${timeline.status}`,
  });

  if (partnerId && policyId) {
    const verifierSteps = runInstitutionalIndependentVerifierMatrix({
      partnerId,
      policyId,
      policyVersion: Number(app.policy_version ?? 1),
    });
    const allPass = verifierSteps.every((s) => s.passed);
    steps.push({
      step: "independent_receipt_verifier_matrix",
      status: allPass ? "pass" : "fail",
      detail: verifierSteps.map((s) => `${s.scenario}:${s.passed ? "ok" : "fail"}`).join(", "),
    });
  }

  steps.push({
    step: "institutional_sandbox_operation_completed",
    status: steps.some((s) => s.step === "hosted_holder_authorization" && s.status === "blocked")
      ? "blocked"
      : "blocked",
    detail: "Full customer operation requires holder authorization plus independently verified live receipt, not harness-only activity.",
  });

  return steps;
}
