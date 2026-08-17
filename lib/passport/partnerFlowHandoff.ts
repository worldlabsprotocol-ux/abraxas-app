"use client";
// FILE: lib/passport/partnerFlowHandoff.ts
// Shared partner-flow handoff controller — sole owner of phase and in-flight state.

import { useCallback, useEffect, useRef, useState } from "react";

export type PartnerFlowHandoffPhase = "idle" | "completing" | "failed";
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
}

export interface PartnerFlowHandoffController {
  isPartnerFlowContext: boolean;
  ready: boolean;
  phase: PartnerFlowHandoffPhase;
  failureCategory: PartnerFlowHandoffFailureCategory | null;
  inFlight: boolean;
  complete: () => Promise<void>;
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
  return Boolean(
    isPartnerFlowContext(ctx)
    && ctx.suiAddress
    && ctx.identityStatus === "earned"
    && ctx.hasCredential,
  );
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
    return_url: decodeURIComponent(ctx.returnPath),
  };

  if (ctx.verificationRequestId) {
    body.verification_request_id = ctx.verificationRequestId;
  }

  return body;
}

export async function postPartnerFlowComplete(
  body: PartnerFlowCompleteBody,
): Promise<{ ok: true; redirectUrl: string } | { ok: false; category: PartnerFlowHandoffFailureCategory }> {
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
    const data = await res.json() as { redirect_url?: string };
    if (res.ok && data.redirect_url) {
      return { ok: true, redirectUrl: data.redirect_url };
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
  complete: async () => {},
};

export function usePartnerFlowHandoff(ctx: PartnerFlowHandoffContext): PartnerFlowHandoffController {
  const [phase, setPhase] = useState<PartnerFlowHandoffPhase>("idle");
  const [failureCategory, setFailureCategory] = useState<PartnerFlowHandoffFailureCategory | null>(null);
  const inFlightRef = useRef(false);

  const isPartnerFlowContextActive = isPartnerFlowContext(ctx);
  const ready = isPartnerFlowHandoffReady(ctx);
  const inFlight = phase === "completing";

  useEffect(() => {
    if (!ready) {
      setPhase("idle");
      setFailureCategory(null);
      inFlightRef.current = false;
    }
  }, [ready]);

  const complete = useCallback(async () => {
    if (!ready || inFlightRef.current) return;

    const body = buildPartnerFlowCompleteBody(ctx);
    if (!body) return;

    inFlightRef.current = true;
    setPhase("completing");
    setFailureCategory(null);

    const result = await postPartnerFlowComplete(body);

    if (result.ok) {
      window.location.href = result.redirectUrl;
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
  ]);

  return {
    isPartnerFlowContext: isPartnerFlowContextActive,
    ready,
    phase,
    failureCategory,
    inFlight,
    complete,
  };
}
