// FILE: lib/passport/verificationActivity/view.ts
// Pure holder-safe projection. Client parameters never choose the subject.

import { createHash } from "crypto";
import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
} from "@/lib/partner/launchpad/policyPacks";
import { resolvePartnerDisplayName, resolvePartnerHomeUrl } from "@/lib/partner/partnerVerifyDisplay";
import { applyDisclosureProfile, resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";
import { GENERIC_MINIMAL_PROFILE } from "@/lib/privacy/selectiveDisclosure/profiles";
import { REUSE_PASSPORT_NOTICE } from "@/lib/passport/reusableEligibility/contract";
import {
  PASSPORT_ACTIVITY_DOCS,
  PASSPORT_ACTIVITY_LIMIT,
  PASSPORT_ACTIVITY_NOTICE,
  PASSPORT_ACTIVITY_STATE_LABELS,
  PASSPORT_ACTIVITY_VERSION,
  PASSPORT_ACTIVITY_WITHHELD,
  type PassportActivityItem,
  type PassportActivityState,
  type PassportActivityView,
} from "./contract";

export type { PassportActivityItem, PassportActivityView };

export interface PassportActivitySourceRow {
  decision_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  decision: string;
  decided_at: string;
  valid_until: string | null;
  decision_status: string;
  requested_action: string | null;
  receipt_status: string | null;
  receipt_context: string | null;
  receipt_expires_at: string | null;
  receipt_revoked_at: string | null;
}

export function opaqueActivityRef(subjectId: string, decisionId: string): string {
  return `act_${createHash("sha256").update(`${subjectId}:${decisionId}`).digest("hex").slice(0, 12)}`;
}

export function isOpaqueActivityRef(value: unknown): value is string {
  return typeof value === "string" && /^act_[a-f0-9]{12}$/.test(value);
}

export function safePurposeText(raw: string | null | undefined, fallback: string): string {
  const text = raw?.trim() ?? "";
  if (!text) return fallback;
  if (/^[0-9a-f-]{32,}$/i.test(text) || /receipt|0x|@/.test(text)) return fallback;
  return text.replace(/_/g, " ").slice(0, 160);
}

export function resolvePassportActivityState(row: PassportActivitySourceRow, now = new Date()): PassportActivityState | null {
  if (row.decision === "manual_review") return null;
  if (row.decision_status === "revoked" || row.receipt_status === "revoked" || row.receipt_revoked_at) {
    return "revoked";
  }
  const until = row.receipt_expires_at || row.valid_until;
  if (row.receipt_status === "expired" || (until && new Date(until) < now)) {
    return "expired";
  }
  if (row.decision === "denied") return "denied";
  const pack = inferPolicyPackFromPolicyId(row.policy_id);
  if (row.receipt_context === "sandbox_only" || (pack && policyPackIsSandboxOnly(pack))) {
    return "sandbox_only";
  }
  if (row.decision === "approved") return "approved";
  return null;
}

function categoryFor(state: PassportActivityState): string {
  switch (state) {
    case "approved":
      return "eligibility confirmed";
    case "sandbox_only":
      return "sandbox eligibility result";
    case "denied":
      return "eligibility not established";
    case "expired":
    case "revoked":
      return "result no longer current";
  }
}

function recoveryFor(state: PassportActivityState): string | null {
  if (state === "expired" || state === "revoked") {
    return "A partner may request a new verification from their usual entry point. Passport does not reissue a hidden result.";
  }
  if (state === "denied") {
    return "Required eligibility was not established. Underlying evidence is not shown.";
  }
  if (state === "sandbox_only") {
    return "This sandbox or test result is not Production-usable.";
  }
  return null;
}

export function buildPassportActivityItem(
  row: PassportActivitySourceRow,
  subjectId: string,
  now = new Date(),
): PassportActivityItem | null {
  const state = resolvePassportActivityState(row, now);
  if (!state) return null;
  const pack = inferPolicyPackFromPolicyId(row.policy_id);
  const purpose = safePurposeText(
    row.requested_action,
    pack?.holder_explanation ?? "Confirm the selected policy result.",
  );
  const withheld = (() => {
    if (pack) {
      const resolved = resolveDisclosureProfile(pack.id);
      if (resolved.ok) return [...resolved.profile.withheld];
    }
    return pack?.partner_does_not_receive?.length
      ? pack.partner_does_not_receive
      : [...PASSPORT_ACTIVITY_WITHHELD];
  })();
  const partnerHref = resolvePartnerHomeUrl(row.partner_id);

  const item: PassportActivityItem = {
    activity_ref: opaqueActivityRef(subjectId, row.decision_id),
    partner_label: resolvePartnerDisplayName(row.partner_id),
    policy_label: pack?.display_name ?? "Selected policy",
    version_summary: `Version ${row.policy_version}`,
    state,
    state_label: PASSPORT_ACTIVITY_STATE_LABELS[state],
    decided_at: row.decided_at,
    shared_result_category: categoryFor(state),
    purpose,
    partner_received: "Only the policy result. Not underlying evidence.",
    withheld,
    evidence_not_shared: "Underlying evidence was not shared with the partner.",
    sandbox_only: state === "sandbox_only",
    current: state === "approved" || state === "sandbox_only",
    recovery: recoveryFor(state),
    partner_entry_href: partnerHref,
    reuse_consent_notice: (state === "approved" || state === "sandbox_only") ? REUSE_PASSPORT_NOTICE : null,
  };
  const profile = pack ? resolveDisclosureProfile(pack.id) : { ok: false as const, reason: "disclosure_unavailable" as const };
  const sealed = applyDisclosureProfile(
    item,
    profile.ok ? profile.profile : GENERIC_MINIMAL_PROFILE,
    "passport_activity",
  );
  return sealed.ok ? sealed.payload as unknown as PassportActivityItem : null;
}

export function buildPassportActivityView(input: {
  subjectId: string;
  rows: PassportActivitySourceRow[];
  now?: Date;
}): PassportActivityView {
  const mapped = input.rows
    .map((row) => buildPassportActivityItem(row, input.subjectId, input.now))
    .filter((item): item is PassportActivityItem => item !== null);
  const items = mapped.slice(0, PASSPORT_ACTIVITY_LIMIT);

  return {
    version: PASSPORT_ACTIVITY_VERSION,
    items,
    truncated: mapped.length > PASSPORT_ACTIVITY_LIMIT,
    notice: PASSPORT_ACTIVITY_NOTICE,
    explanation_href: PASSPORT_ACTIVITY_DOCS.explanation,
    passport_href: PASSPORT_ACTIVITY_DOCS.passport,
  };
}

export function passportActivityCopyLeaks(text: string): string[] {
  const hits: string[] = [];
  if (/abx_(test|live|whsec)_/i.test(text)) hits.push("secret");
  if (/receipt[_-]?id|dr_[a-z0-9]/i.test(text)) hits.push("receipt_id");
  if (/0x[a-f0-9]{20,}/i.test(text)) hits.push("wallet");
  if (/SQLSTATE|relation /i.test(text)) hits.push("backend");
  if (/claims_json|signature|credential_jwt/i.test(text)) hits.push("payload");
  if (/@/.test(text) && /email/i.test(text) && /shared/i.test(text)) hits.push("email");
  return hits;
}
