// FILE: lib/partner/policyProposal/sanitize.ts

import { createHash } from "node:crypto";
import {
  POLICY_PROPOSAL_ALLOWED_BODY_KEYS,
  POLICY_PROPOSAL_CAPABILITIES,
  POLICY_PROPOSAL_CLIENT_OVERRIDE_KEYS,
  POLICY_PROPOSAL_ENVIRONMENTS,
  POLICY_PROPOSAL_OPERATOR_BODY_KEYS,
  POLICY_PROPOSAL_OPERATOR_STATUSES,
  POLICY_PROPOSAL_PLATFORMS,
  POLICY_PROPOSAL_PRIVATE,
  POLICY_PROPOSAL_RECEIVES,
  POLICY_PROPOSAL_RESULTS,
  POLICY_PROPOSAL_ACTIONS,
  type PolicyProposalPlatform,
  type PolicyProposalPrivate,
  type PolicyProposalReceive,
  type PolicyProposalState,
} from "./contract";
import type { PolicyFitAction, PolicyFitCapability, PolicyFitCategory, PolicyFitEnvironment } from "@/lib/partner/integrationStudio/policyFit/contract";
import { sanitizeReviewNote } from "@/lib/partner/launchpad/productionReview/opaque";

export interface SanitizedProposalPayload {
  action: PolicyFitAction;
  result_needed: PolicyFitCategory;
  partner_receives: PolicyProposalReceive[];
  stays_private: PolicyProposalPrivate[];
  environment: PolicyFitEnvironment;
  platform: PolicyProposalPlatform;
  capabilities: PolicyFitCapability[];
}

export function proposalClientOverride(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !allowed.includes(key))) return true;
  return POLICY_PROPOSAL_CLIENT_OVERRIDE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

export function partnerProposalOverride(body: unknown): boolean {
  return proposalClientOverride(body, POLICY_PROPOSAL_ALLOWED_BODY_KEYS);
}

export function operatorProposalOverride(body: unknown): boolean {
  return proposalClientOverride(body, POLICY_PROPOSAL_OPERATOR_BODY_KEYS);
}

function pickAllowed<T extends string>(values: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((item): item is T => typeof item === "string" && (allowed as readonly string[]).includes(item)))];
}

export function sanitizeProposalPayload(body: unknown): SanitizedProposalPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (partnerProposalOverride(body)) return null;
  const action = typeof record.action === "string" && (POLICY_PROPOSAL_ACTIONS as readonly string[]).includes(record.action)
    ? record.action as PolicyFitAction
    : null;
  const result = typeof record.result_needed === "string" && (POLICY_PROPOSAL_RESULTS as readonly string[]).includes(record.result_needed)
    ? record.result_needed as PolicyFitCategory
    : null;
  const environment = typeof record.environment === "string" && (POLICY_PROPOSAL_ENVIRONMENTS as readonly string[]).includes(record.environment)
    ? record.environment as PolicyFitEnvironment
    : null;
  const platform = typeof record.platform === "string" && (POLICY_PROPOSAL_PLATFORMS as readonly string[]).includes(record.platform)
    ? record.platform as PolicyProposalPlatform
    : null;
  const receives = pickAllowed(record.partner_receives, POLICY_PROPOSAL_RECEIVES);
  const stays = pickAllowed(record.stays_private, POLICY_PROPOSAL_PRIVATE);
  const capabilities = pickAllowed(record.capabilities, POLICY_PROPOSAL_CAPABILITIES);
  if (!action || !result || !environment || !platform || receives.length === 0 || stays.length === 0) return null;
  return {
    action,
    result_needed: result,
    partner_receives: receives,
    stays_private: stays,
    environment,
    platform,
    capabilities,
  };
}

export function proposalPayloadHash(payload: SanitizedProposalPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function opaqueProposalRef(id: string): string {
  return `ppr_${createHash("sha256").update(`policy-proposal:${id}`).digest("hex").slice(0, 12)}`;
}

export function sanitizeOperatorRemediation(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return sanitizeReviewNote(raw);
}

export function isOperatorProposalStatus(value: unknown): value is Exclude<PolicyProposalState, "draft" | "submitted"> {
  return typeof value === "string" && (POLICY_PROPOSAL_OPERATOR_STATUSES as readonly string[]).includes(value);
}

export function proposalLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  for (const needle of [
    "abx_live_",
    "abx_test_",
    "abx_whsec_",
    "receipt_id",
    "wallet_address",
    "callback_url",
    "allowed_return_urls",
    "key_hash",
    "sqlstate",
    "oauth",
    "id_token",
  ]) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}

export function buildPlanningRecord(payload: SanitizedProposalPayload) {
  return {
    live_policy: false as const,
    publishes_catalog: false as const,
    mutates_compatibility_edge: false as const,
    proposed_pack_shape: `reviewed_gate_${payload.result_needed}`,
    proposed_version_class: "unassigned",
    disclosure_boundary: {
      partner_receives: payload.partner_receives,
      stays_private: payload.stays_private,
    },
    method_category: payload.result_needed,
    action_scopes: [payload.action],
    capability_classes: payload.capabilities,
    compatibility_class: "review_required",
    environment_intent: payload.environment,
    platform: payload.platform,
  };
}
