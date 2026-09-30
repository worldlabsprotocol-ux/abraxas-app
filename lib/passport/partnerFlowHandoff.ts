"use client";
// FILE: lib/passport/partnerFlowHandoff.ts
// Shared partner-flow handoff controller — sole owner of phase and in-flight state.

import { useCallback, useEffect, useRef, useState } from "react";
import { navigateToPartnerHandoffRedirect } from "@/lib/partner/partnerClientNavigation";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { isProgressivePartnerHandoffReady } from "@/lib/progressiveProof/handoffReady";

export type PartnerFlowHandoffPhase = "idle" | "completing" | "completed" | "failed";
export type PartnerFlowHandoffFailureCategory =
  | "partner_flow_completion_failed"
  | "partner_flow_network_failed";

export interface PartnerFlowHandoffContext {
  suiAddress: string | null;
  identityStatus: string;
  hasCredential: boolean;
  returnPath: string | null;
  partnerId: string | null;
  policyId: string | null;
  verificationRequestId: string | null;
  /** Progressive proof — wallet binding for policy evaluation. */
  walletBound?: boolean;
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
};

export function isPartnerFlowContext(
  ctx: Pick<PartnerFlowHandoffContext, "returnPath" | "partnerId" | "policyId">,
): boolean {
  return Boolean(ctx.returnPath && ctx.partnerId && ctx.policyId);
}

export function isPartnerFlowHandoffReady(ctx: PartnerFlowHandoffContext): boolean {
  if (!isPartnerFlowContext(ctx) || !ctx.suiAddress) return false;

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

  if (ctx.verificationRequestId) {
    body.verification_request_id = ctx.verificationRequestId;
  }

  return body;
}

export async function postPartnerFlowComplete(
  body: PartnerFlowCompleteBody,
): Promise<
  | { ok: true; redirectUrl: string; receiptId: string | null }
  | { ok: false; category: PartnerFlowHandoffFailureCategory }
> {
  try {
    const res = await fetch("/api/v1/partner-flow/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        partner_id: body.partner_id,
        policy_id: body.policy_id,
        return_url: body.return_url,
        verification_request_id: body.verification_request_id ?? undefined,
      }),
    });
    const data = await res.json() as {
      redirect_url?: string;
      partner_result?: { receipt_id?: string };
    };
    if (res.ok && data.redirect_url) {
      return {
        ok: true,
        redirectUrl: data.redirect_url,
        receiptId: data.partner_result?.receipt_id ?? null,
      };
    }
    return { ok: false, category: "partner_flow_completion_failed" };
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
    ctx.verificationRequestId,
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
