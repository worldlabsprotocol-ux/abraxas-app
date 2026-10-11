// Opt-in live sandbox integration tests — genuine HTTP only when authorized.

import {
  InstitutionalReferenceClient,
  type ConsumeEligibilityResponse,
} from "@/lib/institutional/integration/InstitutionalReferenceClient";
import { verifyWebhookSignature, signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";

export type LiveTestStageVerdict = "PASS" | "FAIL" | "BLOCKED";

export type LiveSandboxStageResult = {
  stage: string;
  verdict: LiveTestStageVerdict;
  detail: string;
  correlation_id?: string;
  http_status?: number;
  error_code?: string;
};

export type LiveSandboxIntegrationReport = {
  schema: "institutional_live_sandbox_integration_v1";
  authorized: boolean;
  base_url: string | null;
  overall: LiveTestStageVerdict;
  stages: LiveSandboxStageResult[];
  missing_dependencies: string[];
};

function blocked(stage: string, detail: string): LiveSandboxStageResult {
  return { stage, verdict: "BLOCKED", detail };
}

function consumeHttp(res: ConsumeEligibilityResponse): { status?: number; error?: string } {
  if (res.ok) return {};
  return { status: res.status, error: res.error };
}

export function liveSandboxAuthorizationStatus(): { authorized: boolean; missing: string[] } {
  const missing: string[] = [];
  if (process.env.INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED?.trim() !== "true") {
    missing.push("INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED=true");
  }
  if (!process.env.INSTITUTIONAL_SANDBOX_BASE_URL?.trim()) {
    missing.push("INSTITUTIONAL_SANDBOX_BASE_URL");
  }
  if (!process.env.INSTITUTIONAL_SANDBOX_API_KEY?.trim()) {
    missing.push("INSTITUTIONAL_SANDBOX_API_KEY");
  }
  if (!process.env.INSTITUTIONAL_SANDBOX_PARTNER_ID?.trim()) {
    missing.push("INSTITUTIONAL_SANDBOX_PARTNER_ID");
  }
  if (!process.env.INSTITUTIONAL_SANDBOX_TEST_RECEIPT_ID?.trim()) {
    missing.push("INSTITUTIONAL_SANDBOX_TEST_RECEIPT_ID (valid sandbox receipt for consume path)");
  }
  if (!process.env.INSTITUTIONAL_SANDBOX_TEST_POLICY_ID?.trim()) {
    missing.push("INSTITUTIONAL_SANDBOX_TEST_POLICY_ID");
  }
  return { authorized: missing.length === 0, missing };
}

export async function runLiveSandboxIntegrationTests(input?: {
  fetchFn?: typeof fetch;
}): Promise<LiveSandboxIntegrationReport> {
  const auth = liveSandboxAuthorizationStatus();
  const stages: LiveSandboxStageResult[] = [];
  const baseUrl = process.env.INSTITUTIONAL_SANDBOX_BASE_URL?.trim() ?? null;

  if (!auth.authorized) {
    return {
      schema: "institutional_live_sandbox_integration_v1",
      authorized: false,
      base_url: baseUrl,
      overall: "BLOCKED",
      stages: [blocked("authorization", `Missing: ${auth.missing.join(", ")}`)],
      missing_dependencies: auth.missing,
    };
  }

  const apiKey = process.env.INSTITUTIONAL_SANDBOX_API_KEY!.trim();
  const partnerId = process.env.INSTITUTIONAL_SANDBOX_PARTNER_ID!.trim();
  const receiptId = process.env.INSTITUTIONAL_SANDBOX_TEST_RECEIPT_ID!.trim();
  const policyId = process.env.INSTITUTIONAL_SANDBOX_TEST_POLICY_ID!.trim();
  const wrongPolicy = process.env.INSTITUTIONAL_SANDBOX_WRONG_POLICY_ID?.trim() || `${policyId}-wrong`;
  const wrongPartnerKey = process.env.INSTITUTIONAL_SANDBOX_WRONG_TENANT_API_KEY?.trim();
  const webhookSecret = process.env.INSTITUTIONAL_SANDBOX_WEBHOOK_SECRET?.trim();
  const applicationId = process.env.INSTITUTIONAL_SANDBOX_APPLICATION_ID?.trim() || undefined;

  const client = new InstitutionalReferenceClient({
    baseUrl: baseUrl!,
    apiKey,
    partnerId,
    applicationId,
    fetchFn: input?.fetchFn,
  });

  // Invalid auth
  const badClient = new InstitutionalReferenceClient({
    baseUrl: baseUrl!,
    apiKey: "abx_test_invalid_key_for_probe",
    partnerId,
    fetchFn: input?.fetchFn,
  });
  const badAuth = await badClient.consumeEligibility({
    receipt_id: receiptId,
    policy_id: policyId,
    replay_nonce: client.createReplayNonce(),
  });
  const badAuthHttp = consumeHttp(badAuth);
  stages.push({
    stage: "authentication_invalid_key",
    verdict: !badAuth.ok && badAuthHttp.status === 401 ? "PASS" : "FAIL",
    detail: badAuth.ok ? "unexpected_success" : `http_${badAuthHttp.status}`,
    http_status: badAuthHttp.status,
    error_code: badAuthHttp.error,
  });

  // Receipt status + signature path
  let statusOk = false;
  let signatureValid: boolean | undefined;
  try {
    const status = await client.getReceiptStatus(receiptId);
    statusOk = true;
    signatureValid = status.trust?.signature_valid;
    stages.push({
      stage: "receipt_status_and_signature",
      verdict: statusOk ? "PASS" : "FAIL",
      detail: `currently_valid=${String(status.trust?.currently_valid)} signature_valid=${String(signatureValid)}`,
      correlation_id: receiptId,
    });
  } catch (e) {
    stages.push({
      stage: "receipt_status_and_signature",
      verdict: "FAIL",
      detail: String(e),
    });
  }

  const correlation_id = `live526-${Date.now()}`;
  const nonce1 = client.createReplayNonce();

  const firstConsume = await client.consumeEligibility({
    receipt_id: receiptId,
    policy_id: policyId,
    correlation_id,
    replay_nonce: nonce1,
  });

  const firstHttp = consumeHttp(firstConsume);
  stages.push({
    stage: "eligibility_consume_primary",
    verdict: firstConsume.ok ? "PASS" : firstHttp.status === 403 ? "BLOCKED" : "FAIL",
    detail: firstConsume.ok ? "consume_ok" : `${firstHttp.error} http_${firstHttp.status}`,
    correlation_id,
    http_status: firstHttp.status,
    error_code: firstHttp.error,
  });

  if (firstConsume.ok) {
    const dup = await client.consumeEligibility({
      receipt_id: receiptId,
      policy_id: policyId,
      correlation_id,
      replay_nonce: nonce1,
    });
    const dupHttp = consumeHttp(dup);
    stages.push({
      stage: "duplicate_nonce_rejection",
      verdict: !dup.ok && (dupHttp.status === 409 || dupHttp.error === "replay_rejected") ? "PASS" : "FAIL",
      detail: dup.ok ? "duplicate_succeeded_unexpectedly" : `${dupHttp.error} http_${dupHttp.status}`,
      correlation_id,
      http_status: dupHttp.status,
      error_code: dupHttp.error,
    });
  } else {
    stages.push(blocked("duplicate_nonce_rejection", "primary consume did not succeed"));
  }

  const wrongPolicyConsume = await client.consumeEligibility({
    receipt_id: receiptId,
    policy_id: wrongPolicy,
    replay_nonce: client.createReplayNonce(),
  });
  const wrongPolicyHttp = consumeHttp(wrongPolicyConsume);
  stages.push({
    stage: "wrong_policy_rejection",
    verdict: !wrongPolicyConsume.ok && wrongPolicyHttp.status !== 503 ? "PASS" : "FAIL",
    detail: wrongPolicyConsume.ok ? "unexpected_permit" : `${wrongPolicyHttp.error} http_${wrongPolicyHttp.status}`,
    http_status: wrongPolicyHttp.status,
    error_code: wrongPolicyHttp.error,
  });

  if (wrongPartnerKey) {
    const cross = new InstitutionalReferenceClient({
      baseUrl: baseUrl!,
      apiKey: wrongPartnerKey,
      partnerId: "other-tenant-probe",
      fetchFn: input?.fetchFn,
    });
    const crossRes = await cross.consumeEligibility({
      receipt_id: receiptId,
      policy_id: policyId,
      replay_nonce: cross.createReplayNonce(),
    });
    const crossHttp = consumeHttp(crossRes);
    stages.push({
      stage: "cross_tenant_rejection",
      verdict: !crossRes.ok ? "PASS" : "FAIL",
      detail: crossRes.ok ? "cross_tenant_permitted" : `${crossHttp.error} http_${crossHttp.status}`,
      http_status: crossHttp.status,
    });
  } else {
    stages.push(blocked("cross_tenant_rejection", "Set INSTITUTIONAL_SANDBOX_WRONG_TENANT_API_KEY for cross-tenant probe"));
  }

  if (webhookSecret) {
    const ts = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify({ event: "eligibility.permit", correlation_id });
    const sig = signWebhookBody({ secret: webhookSecret, timestamp: ts, rawBody });
    const verified = verifyWebhookSignature({
      secret: webhookSecret,
      timestamp: ts,
      rawBody,
      signatureHeader: sig,
    });
    stages.push({
      stage: "webhook_hmac_verification",
      verdict: verified.ok ? "PASS" : "FAIL",
      detail: verified.ok ? "hmac_ok" : "hmac_failed",
      correlation_id,
    });
  } else {
    stages.push(blocked("webhook_hmac_verification", "INSTITUTIONAL_SANDBOX_WEBHOOK_SECRET not set"));
  }

  stages.push(blocked(
    "revocation_refresh_live",
    "Requires time-bound receipt fixture — configure operator refresh drill separately",
  ));

  const hasFail = stages.some(s => s.verdict === "FAIL");
  const allPass = stages.every(s => s.verdict === "PASS");
  const overall: LiveTestStageVerdict = hasFail ? "FAIL" : allPass ? "PASS" : "BLOCKED";

  return {
    schema: "institutional_live_sandbox_integration_v1",
    authorized: true,
    base_url: baseUrl,
    overall,
    stages,
    missing_dependencies: [],
  };
}
