// FILE: lib/institutionalCertification/build549/liveStagingProbes.ts

import { vercelBypassHeaders } from "@/lib/preview/vercelBypass";
import type { Build549LiveCaseEvidence } from "./contract";

function baseCase(
  partial: Omit<Build549LiveCaseEvidence, "verification_timestamp">,
): Build549LiveCaseEvidence {
  return {
    verification_timestamp: new Date().toISOString(),
    ...partial,
  };
}

export async function probePreviewSupabaseBinding(input: {
  stagingUrl: string;
  bypass: string;
  deploymentCommit: string | null;
  supabaseRef: string;
}): Promise<Build549LiveCaseEvidence> {
  const url = `${input.stagingUrl.replace(/\/$/, "")}/api/preview/supabase-binding`;
  try {
    const res = await fetch(url, {
      headers: vercelBypassHeaders(input.bypass, { setCookie: false }),
      redirect: "manual",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const productionDetected = body.production_ref_detected === true;
    const pass = res.ok && body.all_match_demo === true && !productionDetected;
    return baseCase({
      test_id: "tenant_isolation_supabase_binding",
      observation_class: "live_staging",
      environment_identity: input.stagingUrl.replace(/https:\/\/[^/]+/, "https://***"),
      deployment_commit: input.deploymentCommit,
      partner_application_id: null,
      policy_id: null,
      synthetic_holder_ref: null,
      receipt_id: null,
      request_correlation_id: null,
      issuer_key_reference: null,
      observed_response_status: String(res.status),
      expected_outcome: "preview bound to authorized nonproduction demo ref; no production ref",
      actual_outcome: productionDetected
        ? "production_ref_detected"
        : pass
          ? "demo_ref_aligned"
          : `all_match_demo=${String(body.all_match_demo)}`,
      cryptographic_authenticity: "not_evaluated",
      current_authorization: "not_evaluated",
      replay_consumption_outcome: null,
      audit_persistence_outcome: null,
      evidence_location: ["/api/preview/supabase-binding"],
      verdict: pass ? "pass" : "fail",
      detail: pass ? `url_ref=${String(body.url_project_ref ?? "unknown")}` : "Supabase binding probe failed",
    });
  } catch (error) {
    return baseCase({
      test_id: "tenant_isolation_supabase_binding",
      observation_class: "live_staging",
      environment_identity: "staging",
      deployment_commit: input.deploymentCommit,
      partner_application_id: null,
      policy_id: null,
      synthetic_holder_ref: null,
      receipt_id: null,
      request_correlation_id: null,
      issuer_key_reference: null,
      observed_response_status: null,
      expected_outcome: "HTTP JSON binding probe",
      actual_outcome: error instanceof Error ? error.message : "fetch_failed",
      cryptographic_authenticity: "not_evaluated",
      current_authorization: "not_evaluated",
      replay_consumption_outcome: null,
      audit_persistence_outcome: null,
      evidence_location: ["/api/preview/supabase-binding"],
      verdict: "fail",
      detail: "Network error probing supabase binding",
    });
  }
}

export async function probeUnauthorizedStudioApi(input: {
  stagingUrl: string;
  bypass: string;
  deploymentCommit: string | null;
}): Promise<Build549LiveCaseEvidence> {
  const url = `${input.stagingUrl.replace(/\/$/, "")}/api/launchpad/auth/session`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: vercelBypassHeaders(input.bypass, { setCookie: false }),
    });
    const pass = res.status === 401 || res.status === 403;
    return baseCase({
      test_id: "unauthorized_partner_credentials_rejected",
      observation_class: "live_staging",
      environment_identity: "staging",
      deployment_commit: input.deploymentCommit,
      partner_application_id: null,
      policy_id: null,
      synthetic_holder_ref: null,
      receipt_id: null,
      request_correlation_id: null,
      issuer_key_reference: null,
      observed_response_status: String(res.status),
      expected_outcome: "401 or 403 without LAUNCHPAD_STUDIO_API_KEY",
      actual_outcome: `HTTP ${res.status}`,
      cryptographic_authenticity: "not_evaluated",
      current_authorization: pass ? "pass" : "fail",
      replay_consumption_outcome: null,
      audit_persistence_outcome: null,
      evidence_location: ["/api/launchpad/auth/session"],
      verdict: pass ? "pass" : "fail",
      detail: pass ? "Unauthenticated studio access rejected" : "Unexpected status for missing credentials",
    });
  } catch (error) {
    return baseCase({
      test_id: "unauthorized_partner_credentials_rejected",
      observation_class: "live_staging",
      environment_identity: "staging",
      deployment_commit: input.deploymentCommit,
      partner_application_id: null,
      policy_id: null,
      synthetic_holder_ref: null,
      receipt_id: null,
      request_correlation_id: null,
      issuer_key_reference: null,
      observed_response_status: null,
      expected_outcome: "401 or 403",
      actual_outcome: error instanceof Error ? error.message : "fetch_failed",
      cryptographic_authenticity: "not_evaluated",
      current_authorization: "not_evaluated",
      replay_consumption_outcome: null,
      audit_persistence_outcome: null,
      evidence_location: ["/api/launchpad/auth/session"],
      verdict: "fail",
      detail: "Could not reach studio API",
    });
  }
}

export async function probePublicReceiptBoundary(input: {
  stagingUrl: string;
  bypass: string;
  deploymentCommit: string | null;
  receiptId: string | null;
}): Promise<Build549LiveCaseEvidence> {
  if (!input.receiptId) {
    return baseCase({
      test_id: "live_public_receipt_fetch",
      observation_class: "live_staging",
      environment_identity: "staging",
      deployment_commit: input.deploymentCommit,
      partner_application_id: null,
      policy_id: null,
      synthetic_holder_ref: null,
      receipt_id: null,
      request_correlation_id: null,
      issuer_key_reference: null,
      observed_response_status: null,
      expected_outcome: "Authorized synthetic receipt HTTP fetch",
      actual_outcome: "BUILD_547_SYNTHETIC_RECEIPT_ID not configured",
      cryptographic_authenticity: "not_evaluated",
      current_authorization: "not_evaluated",
      replay_consumption_outcome: null,
      audit_persistence_outcome: null,
      evidence_location: [],
      verdict: "blocked",
      detail: "Operator must supply authorized staging receipt id",
    });
  }
  const url = `${input.stagingUrl.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(input.receiptId)}/public`;
  const res = await fetch(url, {
    headers: vercelBypassHeaders(input.bypass, { setCookie: false }),
    cache: "no-store",
  });
  if (!res.ok) {
    return baseCase({
      test_id: "live_public_receipt_fetch",
      observation_class: "live_staging",
      environment_identity: "staging",
      deployment_commit: input.deploymentCommit,
      partner_application_id: null,
      policy_id: null,
      synthetic_holder_ref: null,
      receipt_id: input.receiptId,
      request_correlation_id: null,
      issuer_key_reference: null,
      observed_response_status: String(res.status),
      expected_outcome: "HTTP 200 public receipt envelope",
      actual_outcome: `HTTP ${res.status}`,
      cryptographic_authenticity: "not_evaluated",
      current_authorization: "not_evaluated",
      replay_consumption_outcome: null,
      audit_persistence_outcome: null,
      evidence_location: ["/api/receipts/:id/public"],
      verdict: "blocked",
      detail: "Receipt not available or not authorized for certification fetch",
    });
  }
  return baseCase({
    test_id: "live_public_receipt_fetch",
    observation_class: "live_staging",
    environment_identity: "staging",
    deployment_commit: input.deploymentCommit,
    partner_application_id: null,
    policy_id: null,
    synthetic_holder_ref: null,
    receipt_id: input.receiptId,
    request_correlation_id: null,
    issuer_key_reference: null,
    observed_response_status: String(res.status),
    expected_outcome: "HTTP 200",
    actual_outcome: "public receipt body retrieved (verify offline with Build #546)",
    cryptographic_authenticity: "not_evaluated",
    current_authorization: "not_evaluated",
    replay_consumption_outcome: null,
    audit_persistence_outcome: null,
    evidence_location: ["/api/receipts/:id/public"],
    verdict: "pass",
    detail: "Fetch succeeded — independent verification executed in local harness when signed record supplied",
  });
}

export function blockedLiveHolderJourney(input: {
  deploymentCommit: string | null;
  blockers: string[];
}): Build549LiveCaseEvidence {
  return baseCase({
    test_id: "live_holder_passport_to_receipt",
    observation_class: "live_staging",
    environment_identity: "staging",
    deployment_commit: input.deploymentCommit,
    partner_application_id: null,
    policy_id: null,
    synthetic_holder_ref: null,
    receipt_id: null,
    request_correlation_id: null,
    issuer_key_reference: null,
    observed_response_status: null,
    expected_outcome: "Real holder completes Passport verification and receives signed receipt",
    actual_outcome: input.blockers.join("; ") || "missing PARTNER_FLOW_RP_* and holder session",
    cryptographic_authenticity: "not_evaluated",
    current_authorization: "not_evaluated",
    replay_consumption_outcome: null,
    audit_persistence_outcome: null,
    evidence_location: [],
    verdict: "blocked",
    detail: "No synthetic pass — operator must authorize holder credentials and partner binding",
  });
}
