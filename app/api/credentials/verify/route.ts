// FILE: app/api/credentials/verify/route.ts
// Partner verify endpoint — credential JWT, registry record, or policy check.
//
// POST /api/credentials/verify
// Every decision returns authentication_proof + decision_receipt (when signing key configured).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { VerificationResult } from "@/lib/credentials/types";
import { verifyCredentialJwt } from "@/lib/credentials/verifyJwt";
import { resolveVerifierQuery } from "@/lib/verifyRegistry";
import { checkVerificationLevel, type VerificationAction } from "@/lib/verification/checkLevel";
import { resolvePartnerAuth } from "@/lib/partner/partnerAuth";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import {
  DEFAULT_POLICY_ID,
  DEFAULT_POLICY_VERSION,
  attachVerifyProof,
  envelopeFromCredential,
  envelopeFromPolicyCheck,
  envelopeFromRegistry,
  type PartnerVerifyResponse,
  type PartnerVerifyResponseWithProof,
} from "@/lib/partner/partnerDecision";
import { issueVerifyDecisionArtifacts, type VerifyDecisionMode } from "@/lib/authenticationProof/issueVerifyDecision";
import { toAgentVerifyView, toAgentVerifyViewWithoutProof } from "@/lib/agentVerification";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const VALID_ACTIONS: VerificationAction[] = [
  "browse",
  "book_asset",
  "high_value_transaction",
  "invest_rwa",
  "submit_asset",
  "verified_participant",
];

export async function POST(
  req: NextRequest,
): Promise<NextResponse<PartnerVerifyResponseWithProof | PartnerVerifyResponse | VerificationResult | { error: string }>> {
  const started = Date.now();
  const body = await req.json().catch(() => ({})) as {
    credential_jwt?: string;
    record_id?: string;
    policy_id?: string;
    requested_action?: string;
    sui_address?: string;
    verifier_id?: string;
    required_claims?: string[];
  };

  const isPublicCredentialVerify = Boolean(body.credential_jwt?.trim());

  const auth = isPublicCredentialVerify
    ? null
    : await resolvePartnerAuth(req, "verify:credential");
  if (auth && !auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const partnerCtx = auth?.ok ? auth.ctx : null;
  const partnerId = partnerCtx?.partnerId ?? body.verifier_id ?? "public_verifier";
  const policyId = body.policy_id ?? DEFAULT_POLICY_ID;

  let response: PartnerVerifyResponse;
  let httpStatus = 200;
  let mode: VerifyDecisionMode = "registry";

  if (body.credential_jwt) {
    const result = await verifyCredentialJwt(
      body.credential_jwt,
      partnerId,
      body.required_claims ?? [],
      true,
    );
    response = envelopeFromCredential(result, policyId, partnerId);
    httpStatus = result.verified ? 200 : 422;
    mode = "credential_jwt";
  } else if (body.record_id) {
    const registry = await resolveVerifierQuery(body.record_id);
    response = envelopeFromRegistry(registry, policyId, partnerId);
    httpStatus = response.decision === "approved" ? 200 : 404;
    mode = "registry";
  } else if (body.sui_address && body.requested_action) {
    const action = body.requested_action as VerificationAction;
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid requested_action" }, { status: 400 });
    }
    const check = await checkVerificationLevel(body.sui_address, action);
    response = envelopeFromPolicyCheck(
      { decision: check.decision, policy_id: check.policy_id ?? policyId, currentLevel: check.currentLevel },
      partnerId,
      action,
    );
    httpStatus = response.decision === "approved" ? 200 : response.decision === "manual_review" ? 202 : 403;
    mode = "policy_check";
  } else {
    return NextResponse.json(
      { error: "Provide credential_jwt, record_id, or sui_address + requested_action" },
      { status: 400 },
    );
  }

  let payload: PartnerVerifyResponseWithProof;
  try {
    const artifacts = await issueVerifyDecisionArtifacts({
      partnerId,
      response,
      mode,
      suiAddress: body.sui_address,
    });
    payload = attachVerifyProof(response, artifacts);
  } catch (err) {
    console.error("[credentials/verify] proof issuance failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ...response, agent: toAgentVerifyViewWithoutProof(response) },
      { status: httpStatus },
    );
  }

  void logPartnerUsage({
    endpoint: "/api/credentials/verify",
    method: "POST",
    success: response.decision === "approved",
    responseState: response.status,
    partner: partnerCtx,
    httpStatus,
    responseTimeMs: Date.now() - started,
    recordType: response.record_type,
    recordId: response.record_id,
    policyId: response.policy_id,
    policyVersion: response.policy_version ?? DEFAULT_POLICY_VERSION,
    decision: response.decision,
    proofId: payload.proof_id,
  });

  return NextResponse.json(
    { ...payload, agent: toAgentVerifyView(payload) },
    { status: httpStatus },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("wallet");
  if (!address) return NextResponse.json({ error: "sui or wallet param required" }, { status: 400 });

  if (!SB_URL || !SB_KEY) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("identity_verifications")
    .select("status, credential_jti, document_type, document_country, world_id_verified")
    .or(`wallet_address.eq.${address},sui_address.eq.${address}`)
    .maybeSingle();

  if (!data) return NextResponse.json({ verified: false, status: "not_found" });

  return NextResponse.json({
    verified: data.status === "approved",
    status: data.status,
    credential_jti: data.credential_jti,
    document_type: data.document_type,
    jurisdiction: data.document_country,
    world_id: data.world_id_verified,
  });
}
