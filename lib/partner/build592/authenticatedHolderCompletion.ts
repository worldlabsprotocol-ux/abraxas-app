// FILE: lib/partner/build592/authenticatedHolderCompletion.ts
// Authoritative tenant-scoped holder completion — server integration events only.

import { LiveLaunchpadHttpClient } from "@/lib/partner/build584/httpClient";
import type { IntegrationAuditExport } from "@/lib/partner/integrationObservability";
import type {
  AuthenticatedHolderCompletionStatus,
  ResolvedHolderJourneyProvenance,
} from "@/lib/partner/build592/holderJourneyProvenance";

export interface AuthenticatedHolderCompletion {
  status: AuthenticatedHolderCompletionStatus;
  authority: "launchpad_integration_export" | null;
  verification_request_id: string | null;
  detail: string | null;
}

type ExportEvent = IntegrationAuditExport["events"][number];

function unconfirmed(
  detail: string,
  verificationRequestId: string | null = null,
): AuthenticatedHolderCompletion {
  return {
    status: "unconfirmed",
    authority: null,
    verification_request_id: verificationRequestId,
    detail,
  };
}

function requestInitiationObserved(events: ExportEvent[], requestId: string): boolean {
  return events.some(
    (event) =>
      (event.event_type === "verification_request_created"
        || event.event_type === "hosted_handoff_created")
      && event.request_id === requestId,
  );
}

export function evaluateAuthenticatedHolderCompletionFromIntegrationExport(input: {
  export: Pick<IntegrationAuditExport, "partner_id" | "application_id" | "events">;
  expectedPartnerId: string;
  expectedApplicationId: string;
  expectedPolicyId: string;
  expectedReceiptId: string;
  expectedVerificationRequestId?: string | null;
}): AuthenticatedHolderCompletion {
  if (input.export.partner_id !== input.expectedPartnerId) {
    return unconfirmed("export_partner_mismatch");
  }
  if (input.export.application_id !== input.expectedApplicationId) {
    return unconfirmed("export_application_mismatch");
  }

  const events = input.export.events;
  const receiptIssued = events.find(
    (event) =>
      event.event_type === "receipt_issued"
      && event.receipt_id === input.expectedReceiptId,
  );
  if (!receiptIssued) {
    return unconfirmed("receipt_issued_not_bound_to_receipt_id");
  }

  const receiptPolicyId = receiptIssued.policy_id?.trim() ?? "";
  if (!receiptPolicyId) {
    return unconfirmed("receipt_issued_policy_unspecified");
  }
  if (receiptPolicyId !== input.expectedPolicyId) {
    return unconfirmed("receipt_issued_policy_mismatch");
  }

  const receiptRequestId = receiptIssued.request_id?.trim() ?? null;
  const expectedRequestId = input.expectedVerificationRequestId?.trim() ?? null;

  if (expectedRequestId && receiptRequestId && expectedRequestId !== receiptRequestId) {
    return unconfirmed("expected_request_id_receipt_mismatch", expectedRequestId);
  }

  const requestId = expectedRequestId ?? receiptRequestId;
  if (!requestId) {
    return unconfirmed("request_id_required_for_event_correlation");
  }

  if (receiptRequestId && receiptRequestId !== requestId) {
    return unconfirmed("receipt_request_id_mismatch", requestId);
  }

  if (!requestInitiationObserved(events, requestId)) {
    return unconfirmed("verification_request_not_observed", requestId);
  }

  const holderCompletedForRequest = events.some(
    (event) =>
      event.event_type === "holder_flow_completed"
      && event.request_id === requestId,
  );
  if (!holderCompletedForRequest) {
    return unconfirmed("holder_flow_completed_not_bound_to_request", requestId);
  }

  return {
    status: "confirmed",
    authority: "launchpad_integration_export",
    verification_request_id: requestId,
    detail: null,
  };
}

export async function fetchLaunchpadIntegrationExport(input: {
  env: NodeJS.ProcessEnv;
  applicationId: string;
  verificationRequestId?: string | null;
}): Promise<
  | { ok: true; export: IntegrationAuditExport }
  | { ok: false; code: string }
> {
  const base = (
    input.env.BUILD592_SANDBOX_BASE_URL
    ?? input.env.BUILD584_SANDBOX_BASE_URL
    ?? input.env.BUILD583_SANDBOX_BASE_URL
    ?? "https://abraxasworld.xyz"
  ).trim().replace(/\/$/, "");
  const apiKey = (
    input.env.BUILD592_PARTNER_API_KEY
    ?? input.env.BUILD584_PARTNER_API_KEY
    ?? input.env.BUILD583_PARTNER_API_KEY
  )?.trim();
  if (!apiKey) {
    return { ok: false, code: "partner_api_key_missing" };
  }

  const client = new LiveLaunchpadHttpClient(base);
  const session = await client.request("/api/launchpad/auth/session", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!session.ok) {
    return { ok: false, code: `launchpad_session_http_${session.status}` };
  }

  const query = input.verificationRequestId?.trim()
    ? `?request_id=${encodeURIComponent(input.verificationRequestId.trim())}`
    : "";
  const exported = await client.request(
    `/api/launchpad/applications/${input.applicationId}/integration-export${query}`,
  );
  if (!exported.ok) {
    return { ok: false, code: `integration_export_http_${exported.status}` };
  }
  if (!exported.body || typeof exported.body !== "object") {
    return { ok: false, code: "integration_export_invalid" };
  }
  return { ok: true, export: exported.body as IntegrationAuditExport };
}

export function mergeAuthenticatedHolderCompletion(
  holderJourney: ResolvedHolderJourneyProvenance,
  authenticated: AuthenticatedHolderCompletion,
): ResolvedHolderJourneyProvenance {
  return {
    ...holderJourney,
    authenticated_holder_completion: authenticated.status,
    authenticated_completion_authority: authenticated.authority,
    authenticated_completion_detail: authenticated.detail,
    verification_request_id: authenticated.verification_request_id,
  };
}
