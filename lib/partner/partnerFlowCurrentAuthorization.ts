// FILE: lib/partner/partnerFlowCurrentAuthorization.ts
// Canonical holder/partner-flow authorization — workflow completion ≠ current authorization.

import type { PartnerFlowEvaluateResult } from "@/lib/partner/relyingPartyFlow";
import {
  isPartnerFlowRevocationReason,
  partnerFlowRevocationDeniedFields,
  partnerFlowVerificationRequiredFields,
} from "@/lib/partner/partnerFlowReceiptAccess";

export type HolderAuthorizationState = "authorized" | "verification_required" | "denied";

export interface PartnerFlowTrustSnapshot {
  currently_valid: boolean;
  validity: string;
  invalidation_reasons: string[];
}

export interface PartnerFlowTrustGateResult {
  next: Extract<PartnerFlowEvaluateResult["next"], "enter" | "denied" | "verification_required">;
  holder_authorization_state: HolderAuthorizationState;
  redirect_allowed: boolean;
}

/** Server-authoritative holder authorization derived from live trust evaluation. */
export function resolveHolderAuthorizationState(input: {
  currently_valid: boolean;
  invalidation_reasons: string[];
}): HolderAuthorizationState {
  if (input.currently_valid) return "authorized";
  if (input.invalidation_reasons.some(isPartnerFlowRevocationReason)) return "denied";
  return "verification_required";
}

/** Gate enter/redirect on canonical current authorization — not historical decision approval. */
export function resolvePartnerFlowTrustGate(
  input: PartnerFlowTrustSnapshot,
): PartnerFlowTrustGateResult {
  const holder_authorization_state = resolveHolderAuthorizationState(input);

  if (holder_authorization_state === "authorized") {
    return {
      next: "enter",
      holder_authorization_state,
      redirect_allowed: true,
    };
  }

  if (holder_authorization_state === "denied") {
    return {
      next: "denied",
      holder_authorization_state,
      redirect_allowed: false,
    };
  }

  return {
    next: "verification_required",
    holder_authorization_state,
    redirect_allowed: false,
  };
}

export function isPartnerFlowAuthorizationSuccess(input: {
  next?: PartnerFlowEvaluateResult["next"] | null;
  holder_authorization_state?: HolderAuthorizationState | null;
}): boolean {
  return input.next === "enter"
    && input.holder_authorization_state === "authorized";
}

export function isPartnerFlowVerificationRequired(input: {
  next?: PartnerFlowEvaluateResult["next"] | null;
  holder_authorization_state?: HolderAuthorizationState | null;
}): boolean {
  return input.next === "verification_required"
    || input.holder_authorization_state === "verification_required";
}

/** Apply live trust gate to an approved-path partner flow result (preserves historical receipt fields). */
export function applyPartnerFlowTrustGate<T extends PartnerFlowEvaluateResult & { redirect_url?: string }>(
  approved: T,
  trust: PartnerFlowTrustSnapshot,
): PartnerFlowEvaluateResult {
  const gate = resolvePartnerFlowTrustGate(trust);

  if (gate.next === "enter") {
    return {
      ...approved,
      next: "enter",
      holder_authorization_state: "authorized",
      currently_valid: trust.currently_valid,
      validity: trust.validity,
      invalidation_reasons: trust.invalidation_reasons,
    };
  }

  if (gate.next === "denied") {
    return {
      ...partnerFlowRevocationDeniedFields({
        currently_valid: false,
        validity: trust.validity,
        invalidation_reasons: trust.invalidation_reasons,
      }),
      holder_authorization_state: "denied",
      policy_version: approved.policy_version,
      partner_result: approved.partner_result,
      replay_status: approved.replay_status,
      decision_id: approved.decision_id,
      replaced_receipt_id: approved.replaced_receipt_id,
    };
  }

  const { redirect_url: _redirect, ...withoutRedirect } = approved;
  return {
    ...withoutRedirect,
    ...partnerFlowVerificationRequiredFields({
      currently_valid: false,
      validity: trust.validity,
      invalidation_reasons: trust.invalidation_reasons,
    }),
  };
}
