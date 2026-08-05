// FILE: lib/connect/authorizationService.ts
// Connect authorization lifecycle — consent-gated; never auto-approves from partner key alone.

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { getPolicy, createVerificationRequest } from "@/lib/verification/requestsService";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { loadPolicyTrustContext } from "@/lib/trust/loadPolicyTrustContext";
import {
  buildEvaluatedClaimRefs,
  claimTypesFromEvaluation,
} from "@/lib/decisionReceipts/claimRefs";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import { getActiveWalletBinding } from "@/lib/walletAuthority/service";
import { isReturnUrlAllowed, buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { resolveProtocolAppOrigin } from "@/lib/app/publicAppOrigin";
import { dispatchConnectWebhook } from "@/lib/connect/webhooks";
import type {
  ConnectAuthorizationPartnerView,
  ConnectAuthorizationPublicView,
  ConnectAuthorizationRequest,
  ConnectAuthorizationStatus,
} from "@/lib/connect/types";
import type { WalletChain } from "@/lib/walletAuthority/types";

const AUTH_TTL_MS = 30 * 60 * 1000;

export function buildHostedConnectAuthorizeUrl(requestId: string, appOrigin?: string): string {
  const base = resolveProtocolAppOrigin(appOrigin);
  return `${base}/connect/authorize?request=${requestId}`;
}

function generateAuthRequestId(): string {
  return `car_${randomBytes(12).toString("base64url")}`;
}

function mapRow(row: Record<string, unknown>): ConnectAuthorizationRequest {
  return {
    id: row.id as string,
    partner_id: row.partner_id as string,
    policy_id: row.policy_id as string,
    requested_action: (row.requested_action as string | null) ?? null,
    wallet_address: (row.wallet_address as string | null) ?? null,
    chain: row.chain as string,
    chain_id: (row.chain_id as number | null) ?? null,
    return_url: row.return_url as string,
    status: row.status as ConnectAuthorizationStatus,
    subject_id: (row.subject_id as string | null) ?? null,
    verification_request_id: (row.verification_request_id as string | null) ?? null,
    verification_decision_id: (row.verification_decision_id as string | null) ?? null,
    consent_receipt_id: (row.consent_receipt_id as string | null) ?? null,
    receipt_id: (row.receipt_id as string | null) ?? null,
    reason_codes: (row.reason_codes as string[]) ?? [],
    expires_at: row.expires_at as string,
    completed_at: (row.completed_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

async function expireIfNeeded(row: ConnectAuthorizationRequest): Promise<ConnectAuthorizationRequest> {
  if (row.status === "expired" || row.status === "approved" || row.status === "denied" || row.status === "cancelled") {
    return row;
  }
  if (new Date(row.expires_at) < new Date()) {
    const sb = requireSupabaseAdmin();
    await sb.from("connect_authorization_requests")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ...row, status: "expired" };
  }
  return row;
}

export async function createAuthorizationRequest(input: {
  partnerId: string;
  policyId: string;
  requestedAction?: string;
  walletAddress?: string;
  chain?: WalletChain;
  chainId?: number;
  returnUrl: string;
  idempotencyKey?: string;
  appOrigin?: string;
}): Promise<{
  authorization_request_id: string;
  hosted_connect_url: string;
  expires_at: string;
  status: ConnectAuthorizationStatus;
}> {
  if (!(await isReturnUrlAllowed(input.partnerId, input.returnUrl))) {
    throw new Error("return_url not allowlisted for this partner");
  }

  const policy = await getPolicy(input.policyId);
  if (!policy) throw new Error("Policy not found");
  if (policy.partner_id !== input.partnerId && input.partnerId !== "abraxas-connect-demo") {
    // Demo partner may use abraxas policies
    if (policy.partner_id !== "abraxas" && policy.partner_id !== "abraxas-partner-sandbox") {
      throw new Error("Policy not available for this partner");
    }
  }

  const sb = requireSupabaseAdmin();

  if (input.idempotencyKey) {
    const { data: existing } = await sb
      .from("connect_authorization_requests")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) {
      const mapped = mapRow(existing as Record<string, unknown>);
      return {
        authorization_request_id: mapped.id,
        hosted_connect_url: buildHostedConnectAuthorizeUrl(mapped.id, input.appOrigin),
        expires_at: mapped.expires_at,
        status: mapped.status,
      };
    }
  }

  const id = generateAuthRequestId();
  const expiresAt = new Date(Date.now() + AUTH_TTL_MS).toISOString();

  const verification = await createVerificationRequest({
    partnerId: input.partnerId,
    policyId: input.policyId,
    requestedAction: input.requestedAction ?? "connect_authorization",
    suiAddress: undefined,
  });

  const { data, error } = await sb.from("connect_authorization_requests").insert({
    id,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    requested_action: input.requestedAction ?? null,
    wallet_address: input.walletAddress ?? null,
    chain: input.chain ?? "evm",
    chain_id: input.chainId ?? null,
    return_url: input.returnUrl,
    status: "awaiting_user",
    verification_request_id: verification.request_id,
    expires_at: expiresAt,
    idempotency_key: input.idempotencyKey ?? null,
  }).select("*").single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create authorization request");

  await appendAuditEvent({
    actor_type: "partner",
    actor_id: input.partnerId,
    action: "connect.authorization_created",
    object_type: "connect_authorization_request",
    object_id: id,
    policy_id: input.policyId,
    metadata: { return_url_host: new URL(input.returnUrl).host },
  });

  return {
    authorization_request_id: id,
    hosted_connect_url: buildHostedConnectAuthorizeUrl(id, input.appOrigin),
    expires_at: expiresAt,
    status: "awaiting_user",
  };
}

export async function getAuthorizationRequest(requestId: string): Promise<ConnectAuthorizationRequest | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("connect_authorization_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) return null;
  return expireIfNeeded(mapRow(data as Record<string, unknown>));
}

export async function getAuthorizationPublicView(requestId: string): Promise<ConnectAuthorizationPublicView | null> {
  const row = await getAuthorizationRequest(requestId);
  if (!row) return null;
  return {
    authorization_request_id: row.id,
    partner_id: row.partner_id,
    policy_id: row.policy_id,
    requested_action: row.requested_action,
    status: row.status,
    expires_at: row.expires_at,
    wallet_address: row.wallet_address,
    chain: row.chain,
  };
}

export async function completeAuthorizationConsent(input: {
  requestId: string;
  subjectId: string;
}): Promise<{ redirect_url: string; status: ConnectAuthorizationStatus; receipt_id: string | null }> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.subjectId);
  let row = await getAuthorizationRequest(input.requestId);

  if (!row) throw new Error("Authorization request not found");
  if (row.status === "expired") throw new Error("Authorization request expired");
  if (row.status === "approved" || row.status === "denied") {
    return {
      redirect_url: buildRedirectUrl(row.return_url, {
        authorization_request_id: row.id,
        status: row.status,
        receipt_id: row.receipt_id ?? "",
      }),
      status: row.status,
      receipt_id: row.receipt_id,
    };
  }
  if (row.status !== "awaiting_user" && row.status !== "created") {
    throw new Error("Authorization request not awaiting user");
  }

  if (row.wallet_address) {
    const binding = await getActiveWalletBinding(subject, row.wallet_address, row.chain as WalletChain);
    if (!binding) {
      await finalizeDenied(row, subject, ["wallet_not_bound_or_inactive"]);
      return buildDeniedRedirect(row);
    }
    if (binding.binding_status === "compromised" || binding.binding_status === "revoked") {
      await finalizeDenied(row, subject, ["wallet_revoked_or_compromised"]);
      return buildDeniedRedirect(row);
    }
  }

  const policy = await getPolicy(row.policy_id);
  if (!policy) throw new Error("Policy not found");

  const claims = await getActiveClaims(subject);
  const residency = claims.find(c => c.claim_type === "residency_country")?.claim_value?.country as string | undefined;
  const trustContext = await loadPolicyTrustContext({
    partnerId: row.partner_id,
    policyId: row.policy_id,
    jurisdiction: residency ?? claims.find(c => c.jurisdiction)?.jurisdiction,
  });

  const evaluation = evaluatePolicyRules(policy.rules_json, claims, {
    jurisdiction: trustContext.jurisdiction,
    partnerId: trustContext.partnerId,
    policyId: trustContext.policyId,
    trustRulesByClaimType: trustContext.trustRulesByClaimType,
  });

  await sb.from("connect_authorization_requests")
    .update({ status: "consented", subject_id: subject, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  const { data: consent } = await sb.from("consent_receipts").insert({
    subject_id: subject,
    partner_id: row.partner_id,
    request_id: row.verification_request_id,
    purpose: row.requested_action ?? "connect_authorization",
    claims_authorized: Object.keys(evaluation.claims),
    expires_at: evaluation.valid_until,
  }).select("id").single();

  const decisionResult = evaluation.decision === "approved" ? "approved"
    : evaluation.decision === "manual_review" ? "manual_review" : "denied";

  const { data: decisionRow } = await sb.from("verification_decisions").insert({
    request_id: row.verification_request_id,
    partner_id: row.partner_id,
    subject_id: subject,
    policy_id: policy.id,
    policy_version: policy.version,
    decision: decisionResult,
    claims_json: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: evaluation.valid_until,
    status: "active",
  }).select("id").single();

  const claimTypes = claimTypesFromEvaluation(evaluation.claims);
  const evaluatedClaimRefs = buildEvaluatedClaimRefs(
    claims,
    claimTypes.length ? claimTypes : (policy.rules_json.required_claims ?? []).map(r => r.claim_type),
  );

  let receiptId: string | null = null;
  if (decisionRow) {
    const receipt = await issueReceiptForDecision({
      decisionId: decisionRow.id as string,
      consentReceiptId: consent?.id as string,
      partnerId: row.partner_id,
      policyId: policy.id,
      policyVersion: policy.version,
      subjectId: subject,
      decisionResult,
      reasonCodes: evaluation.reason_codes,
      claimsJson: evaluation.claims,
      evaluatedClaimRefs,
      expiresAt: evaluation.valid_until,
      decisionContext: isSandboxPolicyId(policy.id) || evaluation.decision_context === "sandbox_only"
        ? "sandbox_only"
        : "production",
    });
    receiptId = receipt?.id ?? null;
  }

  const finalStatus: ConnectAuthorizationStatus =
    evaluation.decision === "approved" ? "approved" : "denied";
  const now = new Date().toISOString();

  await sb.from("connect_authorization_requests").update({
    status: finalStatus,
    verification_decision_id: decisionRow?.id ?? null,
    consent_receipt_id: consent?.id ?? null,
    receipt_id: receiptId,
    reason_codes: evaluation.reason_codes,
    completed_at: now,
    updated_at: now,
  }).eq("id", row.id);

  if (row.verification_request_id) {
    await sb.from("verification_requests").update({
      status: "decided",
      subject_id: subject,
      sui_address: subject,
      consent_id: consent?.id ?? null,
    }).eq("id", row.verification_request_id);
  }

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: `connect.authorization_${finalStatus}`,
    object_type: "connect_authorization_request",
    object_id: row.id,
    policy_id: row.policy_id,
    metadata: { receipt_id: receiptId, reason_codes: evaluation.reason_codes },
  });

  void dispatchConnectWebhook({
    partnerId: row.partner_id,
    authorizationId: row.id,
    status: finalStatus,
    receiptId,
    reasonCodes: evaluation.reason_codes,
  });

  row = (await getAuthorizationRequest(row.id))!;

  return {
    redirect_url: buildRedirectUrl(row.return_url, {
      authorization_request_id: row.id,
      status: finalStatus,
      receipt_id: receiptId ?? "",
    }),
    status: finalStatus,
    receipt_id: receiptId,
  };
}

async function finalizeDenied(
  row: ConnectAuthorizationRequest,
  subject: string,
  reasonCodes: string[],
): Promise<void> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  await sb.from("connect_authorization_requests").update({
    status: "denied",
    subject_id: subject,
    reason_codes: reasonCodes,
    completed_at: now,
    updated_at: now,
  }).eq("id", row.id);
}

function buildDeniedRedirect(row: ConnectAuthorizationRequest) {
  return {
    redirect_url: buildRedirectUrl(row.return_url, {
      authorization_request_id: row.id,
      status: "denied",
      receipt_id: "",
    }),
    status: "denied" as ConnectAuthorizationStatus,
    receipt_id: null,
  };
}

export async function getPartnerAuthorizationStatus(
  requestId: string,
  partnerId: string,
): Promise<ConnectAuthorizationPartnerView | null> {
  const row = await getAuthorizationRequest(requestId);
  if (!row || row.partner_id !== partnerId) return null;

  let currentlyValid: boolean | null = null;
  let validity: string | null = null;

  if (row.receipt_id) {
    const receipt = await getReceiptById(row.receipt_id);
    if (receipt) {
      const resolved = await resolveReceiptValidity(receipt, {
        partnerId,
        policyId: row.policy_id,
      });
      currentlyValid = resolved.currently_valid;
      validity = resolved.validity;
    }
  }

  return {
    authorization_request_id: row.id,
    status: row.status,
    approved: row.status === "approved",
    receipt_id: row.receipt_id,
    valid_until: null,
    reason_codes: row.reason_codes,
    currently_valid: currentlyValid,
    validity,
  };
}
