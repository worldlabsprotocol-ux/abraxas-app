"use client";
// FILE: lib/passport/partnerFlowHandoff.ts
// Shared partner-flow handoff controller — sole owner of phase and in-flight state.

import { useCallback, useEffect, useRef, useState } from "react";
import { navigateToPartnerHandoffRedirect } from "@/lib/partner/partnerClientNavigation";
import {
  isOpaqueVerifyRequest,
  isVerificationRequestUuid,
} from "@/lib/partner/partnerFlowContinuationIdentifiers";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { isProgressivePartnerHandoffReady } from "@/lib/progressiveProof/handoffReady";
import { isContentOriginDisclosurePolicyId } from "@/lib/provenance/constants";

export type PartnerFlowHandoffPhase = "idle" | "completing" | "completed" | "failed";
export type PartnerFlowHandoffFailureCategory =
  | "partner_flow_completion_failed"
  | "partner_flow_network_failed"
  | "partner_flow_server_unavailable"
  | "partner_flow_handoff_invalid";

export interface PartnerFlowHandoffContext {
  suiAddress: string | null;
  identityStatus: string;
  hasCredential: boolean;
  returnPath: string | null;
  partnerId: string | null;
  policyId: string | null;
  /** Opaque vr_* hosted token or canonical verification_requests.id UUID. */
  verifyRequestRef: string | null;
  /** Progressive proof — wallet binding for policy evaluation. */
  walletBound?: boolean;
  /** Content provenance disclosure submitted for artifact-bound evaluation. */
  provenanceEvidenceComplete?: boolean;
}

export interface PartnerFlowHandoffController {
  isPartnerFlowContext: boolean;
  ready: boolean;
  phase: PartnerFlowHandoffPhase;
  failureCategory: PartnerFlowHandoffFailureCategory | null;
  inFlight: boolean;
  receiptId: string | null;
  redirectUrl: string | null;
  complete: () => Promise<void>;
  navigateToPartner: () => void;
}

export type PartnerFlowCompleteBody = {
  partner_id: string;
  policy_id: string;
  return_url: string;
  verification_request_id?: string;
  verify_request?: string;
};

export function isPartnerFlowContext(
  ctx: Pick<PartnerFlowHandoffContext, "returnPath" | "partnerId" | "policyId">,
): boolean {
  return Boolean(ctx.returnPath && ctx.partnerId && ctx.policyId);
}

export function isPartnerFlowHandoffReady(ctx: PartnerFlowHandoffContext): boolean {
  if (!isPartnerFlowContext(ctx) || !ctx.suiAddress) return false;

  if (ctx.policyId && isContentOriginDisclosurePolicyId(ctx.policyId)) {
    return ctx.provenanceEvidenceComplete === true;
  }

  const policyRules = ctx.policyId ? findProductionPolicyRules(ctx.policyId) : null;

  return isProgressivePartnerHandoffReady({
    signedIn: true,
    walletBound: ctx.walletBound ?? true,
    identityCredentialEarned: ctx.identityStatus === "earned",
    hasCredential: ctx.hasCredential,
    policyRules,
  });
}

export function buildPartnerFlowCompleteBody(
  ctx: PartnerFlowHandoffContext,
): PartnerFlowCompleteBody | null {
  if (!isPartnerFlowHandoffReady(ctx) || !ctx.returnPath || !ctx.partnerId || !ctx.policyId) {
    return null;
  }

  const body: PartnerFlowCompleteBody = {
    partner_id: ctx.partnerId,
    policy_id: ctx.policyId,
    return_url: ctx.returnPath,
  };

  const ref = ctx.verifyRequestRef?.trim();
  if (ref) {
    if (isOpaqueVerifyRequest(ref)) {
      body.verify_request = ref;
    } else if (isVerificationRequestUuid(ref)) {
      body.verification_request_id = ref;
    }
  }

  return body;
}

function classifyCompleteFailure(
  res: Response,
  data: Record<string, unknown> | null,
): PartnerFlowHandoffFailureCategory {
  const code = typeof data?.code === "string" ? data.code : undefined;
  if (code === "handoff_expired" || code === "handoff_missing" || res.status === 410 || res.status === 404) {
    return "partner_flow_handoff_invalid";
  }
  if (res.status >= 500 || code === "sui_rpc_unavailable") {
    return "partner_flow_server_unavailable";
  }
  return "partner_flow_completion_failed";
}

export async function postPartnerFlowComplete(
  body: PartnerFlowCompleteBody,
): Promise<
  | { ok: true; redirectUrl: string; receiptId: string | null }
  | { ok: false; category: PartnerFlowHandoffFailureCategory }
> {
  try {
    const payload: Record<string, string> = {
      partner_id: body.partner_id,
      policy_id: body.policy_id,
      return_url: body.return_url,
    };
    if (body.verification_request_id) {
      payload.verification_request_id = body.verification_request_id;
    }
    if (body.verify_request) {
      payload.verify_request = body.verify_request;
    }

    const res = await fetch("/api/v1/partner-flow/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data: Record<string, unknown> | null = null;
    try {
      data = await res.json() as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        return {
          ok: false,
          category: res.status >= 500
            ? "partner_flow_server_unavailable"
            : "partner_flow_network_failed",
        };
      }
      return { ok: false, category: "partner_flow_network_failed" };
    }

    if (res.ok && typeof data.redirect_url === "string" && data.redirect_url) {
      const partnerResult = data.partner_result as { receipt_id?: string } | undefined;
      return {
        ok: true,
        redirectUrl: data.redirect_url,
        receiptId: partnerResult?.receipt_id ?? null,
      };
    }

    return { ok: false, category: classifyCompleteFailure(res, data) };
  } catch {
    return { ok: false, category: "partner_flow_network_failed" };
  }
}

export const IDLE_PARTNER_FLOW_HANDOFF: PartnerFlowHandoffController = {
  isPartnerFlowContext: false,
  ready: false,
  phase: "idle",
  failureCategory: null,
  inFlight: false,
  receiptId: null,
  redirectUrl: null,
  complete: async () => {},
  navigateToPartner: () => {},
};

export function usePartnerFlowHandoff(ctx: PartnerFlowHandoffContext): PartnerFlowHandoffController {
  const [phase, setPhase] = useState<PartnerFlowHandoffPhase>("idle");
  const [failureCategory, setFailureCategory] = useState<PartnerFlowHandoffFailureCategory | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const isPartnerFlowContextActive = isPartnerFlowContext(ctx);
  const ready = isPartnerFlowHandoffReady(ctx);
  const inFlight = phase === "completing";

  useEffect(() => {
    if (!ready) {
      setPhase("idle");
      setFailureCategory(null);
      setReceiptId(null);
      setRedirectUrl(null);
      inFlightRef.current = false;
    }
  }, [ready]);

  const navigateToPartner = useCallback(() => {
    if (!redirectUrl) return;
    navigateToPartnerHandoffRedirect(redirectUrl);
  }, [redirectUrl]);

  const complete = useCallback(async () => {
    if (!ready || inFlightRef.current || phase === "completed") return;

    const body = buildPartnerFlowCompleteBody(ctx);
    if (!body) return;

    inFlightRef.current = true;
    setPhase("completing");
    setFailureCategory(null);

    const result = await postPartnerFlowComplete(body);

    if (result.ok) {
      setReceiptId(result.receiptId);
      setRedirectUrl(result.redirectUrl);
      setPhase("completed");
      inFlightRef.current = false;
      return;
    }

    setFailureCategory(result.category);
    setPhase("failed");
    inFlightRef.current = false;
  }, [
    ctx.suiAddress,
    ctx.identityStatus,
    ctx.hasCredential,
    ctx.returnPath,
    ctx.partnerId,
    ctx.policyId,
    ctx.verifyRequestRef,
    ready,
    phase,
  ]);

  return {
    isPartnerFlowContext: isPartnerFlowContextActive,
    ready,
    phase,
    failureCategory,
    inFlight,
    receiptId,
    redirectUrl,
    complete,
    navigateToPartner,
  };
}
