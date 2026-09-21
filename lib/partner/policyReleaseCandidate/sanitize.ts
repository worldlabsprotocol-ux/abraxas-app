// FILE: lib/partner/policyReleaseCandidate/sanitize.ts

import { createHash } from "node:crypto";
import type { SanitizedProposalPayload } from "@/lib/partner/policyProposal/sanitize";
import { proposalLeaks } from "@/lib/partner/policyProposal/sanitize";
import { sanitizeReviewNote } from "@/lib/partner/launchpad/productionReview/opaque";
import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure/leakDetector";
import {
  POLICY_RC_ACTIONS,
  POLICY_RC_ASSURANCE,
  POLICY_RC_CLIENT_OVERRIDE_KEYS,
  POLICY_RC_COMPATIBILITY,
  POLICY_RC_CREATE_KEYS,
  POLICY_RC_DECIDE_KEYS,
  POLICY_RC_DISCLOSURE,
  POLICY_RC_ENVIRONMENTS,
  POLICY_RC_LABELS,
  POLICY_RC_METHODS,
  POLICY_RC_PRIVATE,
  POLICY_RC_RECEIVES,
  POLICY_RC_RESULTS,
  POLICY_RC_SCOPES,
  isPolicyRcState,
  type PolicyRcAssurance,
  type PolicyRcCompatibility,
  type PolicyRcDisclosure,
  type PolicyRcLabel,
  type PolicyRcMethod,
  type PolicyRcState,
} from "./contract";
import type { PolicyFitAction, PolicyFitCategory, PolicyFitEnvironment } from "@/lib/partner/integrationStudio/policyFit/contract";
import type { PolicyProposalPrivate, PolicyProposalReceive } from "@/lib/partner/policyProposal/contract";
import type { PortableActionScope } from "@/lib/partner/portableActionContract/contract";

export interface SanitizedReleaseShape {
  policy_label: PolicyRcLabel;
  action: PolicyFitAction;
  result_category: PolicyFitCategory;
  shared_result: PolicyProposalReceive[];
  withheld: PolicyProposalPrivate[];
  method_category: PolicyRcMethod;
  minimum_assurance: PolicyRcAssurance;
  environment: PolicyFitEnvironment;
  action_scopes: PortableActionScope[];
  disclosure_profile: PolicyRcDisclosure;
  compatibility_impact: PolicyRcCompatibility;
  live_policy: false;
  publishes_catalog: false;
  mutates_compatibility_edge: false;
}

export function rcClientOverride(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !allowed.includes(key))) return true;
  return POLICY_RC_CLIENT_OVERRIDE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

export function createReleaseOverride(body: unknown): boolean {
  return rcClientOverride(body, POLICY_RC_CREATE_KEYS);
}

export function decideReleaseOverride(body: unknown): boolean {
  return rcClientOverride(body, POLICY_RC_DECIDE_KEYS);
}

function pickAllowed<T extends string>(values: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((item): item is T => typeof item === "string" && (allowed as readonly string[]).includes(item))));
}

function pickOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

export function deriveReleaseShape(proposal: SanitizedProposalPayload, body: unknown): SanitizedReleaseShape | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (createReleaseOverride(body)) return null;
  const record = body as Record<string, unknown>;
  const result = pickOne(record.result_category, POLICY_RC_RESULTS, proposal.result_needed);
  const defaultLabel = `reviewed_gate_${result}` as PolicyRcLabel;
  const policy_label = pickOne(record.policy_label, POLICY_RC_LABELS, defaultLabel);
  const shared = pickAllowed(record.shared_result ?? proposal.partner_receives, POLICY_RC_RECEIVES);
  const withheld = pickAllowed(record.withheld ?? proposal.stays_private, POLICY_RC_PRIVATE);
  const scopes = pickAllowed(record.action_scopes, POLICY_RC_SCOPES);
  if (shared.length === 0 || withheld.length === 0) return null;
  return {
    policy_label,
    action: pickOne(record.action, POLICY_RC_ACTIONS, proposal.action),
    result_category: result,
    shared_result: shared,
    withheld,
    method_category: pickOne(record.method_category, POLICY_RC_METHODS, "reuse_existing_proof"),
    minimum_assurance: pickOne(record.minimum_assurance, POLICY_RC_ASSURANCE, "L1"),
    environment: pickOne(record.environment, POLICY_RC_ENVIRONMENTS, proposal.environment),
    action_scopes: scopes.length > 0 ? scopes : ["sandbox:protocol_access"],
    disclosure_profile: pickOne(record.disclosure_profile, POLICY_RC_DISCLOSURE, "result_only"),
    compatibility_impact: pickOne(record.compatibility_impact, POLICY_RC_COMPATIBILITY, "policy_review"),
    live_policy: false,
    publishes_catalog: false,
    mutates_compatibility_edge: false,
  };
}

export function releaseShapeHash(shape: SanitizedReleaseShape): string {
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex");
}

export function opaqueCandidateRef(id: string): string {
  return `prc_${createHash("sha256").update(`policy-release-candidate:${id}`).digest("hex").slice(0, 12)}`;
}

export function sanitizeOperatorRemediation(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return sanitizeReviewNote(raw);
}

export function isOperatorRcStatus(value: unknown): value is PolicyRcState {
  return typeof value === "string" && isPolicyRcState(value);
}

export function releaseLeaks(payload: unknown): string[] {
  return [...proposalLeaks(payload), ...detectDisclosureLeaks(payload)];
}
