// FILE: lib/admin/partnerOnboardingConsole.ts
// Admin Partner Onboarding Console — readiness, validation, pilot checklist.

import { validatePartnerReturnUrlFormat } from "@/lib/partner/referenceRelyingPartyConfig";
import type { PartnerPolicyRules } from "@/lib/policy/types";

export const PILOT_PARTNER_CREATE_STATUSES = ["pilot", "recruiting"] as const;
export type PilotPartnerCreateStatus = (typeof PILOT_PARTNER_CREATE_STATUSES)[number];

export type ReadinessLevel = "pass" | "fail" | "pending";

export interface PartnerPolicySummary {
  id: string;
  version: number;
  status: string;
  name: string;
  partner_id: string;
}

export interface PartnerOnboardingRecord {
  partner_id: string;
  company: string;
  status: string;
  is_external: boolean;
  allowed_environments: string[];
  allowed_return_urls: string[];
  assigned_policy_id: string | null;
  use_case: string | null;
  legal_entity: string | null;
  created_at: string;
  updated_at: string;
  active_policy: PartnerPolicySummary | null;
  draft_policy: PartnerPolicySummary | null;
  readiness: PartnerPilotReadiness;
}

export interface PartnerPilotReadiness {
  partner_row: ReadinessLevel;
  active_policy: ReadinessLevel;
  callback_allowlist: ReadinessLevel;
  conformance_config: ReadinessLevel;
  overall: "ready" | "not_ready";
  blockers: string[];
}

export interface SecondPartnerPilotChecklistItem {
  id: string;
  label: string;
  done: boolean;
  operator_note: string;
}

export const DEFAULT_PILOT_POLICY_RULES: PartnerPolicyRules = {
  consent_required: true,
  minimum_age: 21,
  session_receipt_hours: 24,
  sandbox_only: true,
  required_claims: [
    { claim_type: "identity_verified" },
    { claim_type: "residency_country" },
  ],
};

/** Non-sandbox draft starting point — operators must review before publish. */
export const DEFAULT_PRODUCTION_POLICY_RULES: PartnerPolicyRules = {
  ...DEFAULT_PILOT_POLICY_RULES,
  sandbox_only: false,
};

export const PRODUCTION_POLICY_DRAFT_OPERATOR_NOTE =
  "Non-sandbox draft template for operator review only. Confirm claim requirements, age gates, and jurisdictional rules with your partner before publishing — this template is not legally or commercially certified for every partner.";

export function buildPartnersOnboardingUrl(partnerId: string, promoted = false): string {
  const params = new URLSearchParams({ partner_id: partnerId });
  if (promoted) params.set("promoted", "1");
  return `/admin/partners?${params.toString()}`;
}

export function resolveReadinessDeepLinkInput(
  record: Pick<PartnerOnboardingRecord, "partner_id" | "assigned_policy_id" | "allowed_return_urls"> & {
    active_policy?: { id: string } | null;
  },
): { partnerId: string; policyId: string; returnUrl: string } | null {
  const returnUrl = record.allowed_return_urls[0]?.trim();
  const policyId = record.assigned_policy_id ?? record.active_policy?.id ?? null;
  if (!returnUrl || !policyId) return null;
  return { partnerId: record.partner_id, policyId, returnUrl };
}

export function isAllowedPilotPartnerCreateStatus(status: string): status is PilotPartnerCreateStatus {
  return (PILOT_PARTNER_CREATE_STATUSES as readonly string[]).includes(status);
}

export function assertPilotPartnerCreateStatus(status: string): PilotPartnerCreateStatus {
  if (!isAllowedPilotPartnerCreateStatus(status)) {
    throw new Error(
      `Partner status must be pilot or recruiting for new onboarding (got: ${status}). Promote to active separately.`,
    );
  }
  return status;
}

export function validateReturnUrlsForAllowlist(urls: string[]): {
  accepted: string[];
  rejected: Array<{ url: string; errors: string[] }>;
} {
  const accepted: string[] = [];
  const rejected: Array<{ url: string; errors: string[] }> = [];

  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    const result = validatePartnerReturnUrlFormat(url);
    if (result.ok) {
      accepted.push(url);
    } else {
      rejected.push({ url, errors: result.errors });
    }
  }

  return { accepted, rejected };
}

export function mergeReturnUrlAllowlist(
  existing: string[] | null | undefined,
  additions: string[],
): string[] {
  const merged = new Set<string>();
  for (const url of existing ?? []) {
    const trimmed = url.trim();
    if (trimmed) merged.add(trimmed);
  }
  for (const url of additions) {
    merged.add(url.trim());
  }
  return Array.from(merged);
}

export function assessPartnerPilotReadiness(input: {
  partner_id: string;
  status: string;
  is_external: boolean;
  allowed_return_urls: string[] | null | undefined;
  active_policy: PartnerPolicySummary | null;
  assigned_policy_id?: string | null;
}): PartnerPilotReadiness {
  const blockers: string[] = [];
  const urls = input.allowed_return_urls ?? [];

  const partner_row: ReadinessLevel =
    input.partner_id && input.is_external ? "pass" : "fail";
  if (partner_row === "fail") {
    blockers.push("Partner row missing or not marked is_external");
  }

  const active_policy: ReadinessLevel = input.active_policy ? "pass" : "fail";
  if (active_policy === "fail") {
    blockers.push("No active policy version for partner");
  }

  let callback_allowlist: ReadinessLevel = "fail";
  if (urls.length === 0) {
    blockers.push("allowed_return_urls is empty");
  } else {
    const invalid = urls.filter(u => !validatePartnerReturnUrlFormat(u).ok);
    callback_allowlist = invalid.length === 0 ? "pass" : "fail";
    if (invalid.length > 0) {
      blockers.push(`Invalid callback URL format: ${invalid.length} URL(s)`);
    }
  }

  let conformance_config: ReadinessLevel = "pending";
  const primaryUrl = urls[0];
  if (
    input.active_policy
    && primaryUrl
    && validatePartnerReturnUrlFormat(primaryUrl).ok
  ) {
    conformance_config = "pass";
  } else if (!input.active_policy || !primaryUrl) {
    conformance_config = "fail";
    blockers.push("Conformance env incomplete (need active policy + primary callback URL)");
  }

  if (
    input.assigned_policy_id
    && input.active_policy
    && input.assigned_policy_id !== input.active_policy.id
  ) {
    blockers.push("assigned_policy_id does not match active policy id");
  }

  const overall =
    partner_row === "pass"
    && active_policy === "pass"
    && callback_allowlist === "pass"
    && conformance_config === "pass"
      ? "ready"
      : "not_ready";

  return {
    partner_row,
    active_policy,
    callback_allowlist,
    conformance_config,
    overall,
    blockers,
  };
}

export function buildSecondPartnerPilotChecklist(
  record: Pick<PartnerOnboardingRecord, "partner_id" | "active_policy" | "allowed_return_urls" | "readiness">,
): SecondPartnerPilotChecklistItem[] {
  const primaryUrl = record.allowed_return_urls[0] ?? "";
  const policyId = record.active_policy?.id ?? "";

  return [
    {
      id: "partner_row",
      label: "Partner row provisioned (pilot / recruiting)",
      done: record.readiness.partner_row === "pass",
      operator_note: `partner_id=${record.partner_id}`,
    },
    {
      id: "active_policy",
      label: "Active immutable policy published",
      done: record.readiness.active_policy === "pass",
      operator_note: policyId ? `policy_id=${policyId}` : "Create draft → publish via console",
    },
    {
      id: "return_urls",
      label: "Exact HTTPS callback URLs allowlisted",
      done: record.readiness.callback_allowlist === "pass",
      operator_note: primaryUrl || "Add callback URL in console",
    },
    {
      id: "conformance",
      label: "Partner Flow Conformance Kit configured",
      done: record.readiness.conformance_config === "pass",
      operator_note:
        "npm run partner:conformance with PARTNER_FLOW_RP_PARTNER_ID, PARTNER_FLOW_RP_POLICY_ID, PARTNER_FLOW_RP_RETURN_URL",
    },
    {
      id: "live_flow",
      label: "Live evaluate → Passport → complete → callback",
      done: false,
      operator_note: "Human pilot — docs/SECOND_PARTNER_PILOT_RUNBOOK.md §5",
    },
    {
      id: "receipt_signature",
      label: "Public receipt signature_valid: true",
      done: false,
      operator_note: "GET /api/receipts/{receipt_id}/public after live flow",
    },
    {
      id: "audit_trace",
      label: "Audit trace correlation (flow_trace_id)",
      done: false,
      operator_note: "npm run audit:partner-flow-trace -- ft_vr_<verification_request_id>",
    },
  ];
}

export function buildConformanceCommand(record: PartnerOnboardingRecord): string | null {
  const returnUrl = record.allowed_return_urls[0];
  const policyId = record.active_policy?.id;
  if (!returnUrl || !policyId) return null;

  return [
    `PARTNER_FLOW_RP_PARTNER_ID=${record.partner_id} \\`,
    `PARTNER_FLOW_RP_POLICY_ID=${policyId} \\`,
    `PARTNER_FLOW_RP_RETURN_URL=${returnUrl} \\`,
    `PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\`,
    "npm run partner:conformance",
  ].join("\n");
}
