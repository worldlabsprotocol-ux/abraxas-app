// FILE: lib/protocol/protocolFlowCatalog.ts
// Canonical policy truth for Protocol in Action — derived from policy packs, not marketing copy.

import {
  POLICY_PACK_LIST,
  type PolicyPack,
  type PolicyPackId,
  policyPackIsSandboxOnly,
} from "@/lib/partner/launchpad/policyPacks";

export type ProtocolFlowMode = "traditional" | "abraxas";

export type ProtocolFlowStepId =
  | "request"
  | "consent"
  | "evidence"
  | "evaluate"
  | "disclose"
  | "sign"
  | "verify"
  | "reuse";

export const PROTOCOL_FLOW_STEPS: ReadonlyArray<{
  id: ProtocolFlowStepId;
  label: string;
  short: string;
}> = [
  { id: "request", label: "Request", short: "01" },
  { id: "consent", label: "Consent", short: "02" },
  { id: "evidence", label: "Evidence", short: "03" },
  { id: "evaluate", label: "Evaluate", short: "04" },
  { id: "disclose", label: "Disclose", short: "05" },
  { id: "sign", label: "Sign", short: "06" },
  { id: "verify", label: "Verify", short: "07" },
  { id: "reuse", label: "Reuse", short: "08" },
];

/** Default protected fields shown inside the privacy boundary for identity-bearing packs. */
const DEFAULT_PROTECTED = [
  "Date of birth",
  "Government ID",
  "Legal name",
  "Documents",
  "Profile",
] as const;

function normalizeProtected(pack: PolicyPack): string[] {
  const fromPack = pack.partner_does_not_receive.map((item) => {
    const normalized = item.replace(/_/g, " ");
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  });
  return fromPack.length > 0 ? fromPack : [...DEFAULT_PROTECTED];
}

export interface ProtocolFlowPolicyView {
  id: PolicyPackId;
  displayName: string;
  question: string;
  disclosedResult: string;
  disclosedLabel: string;
  protectedFields: string[];
  partnerReceives: string;
  reuseNote: string;
  sandboxOnly: boolean;
  minimumAssurance: string;
  receiptLifetimeHours: number;
}

function toPolicyView(pack: PolicyPack): ProtocolFlowPolicyView {
  const disclosed = pack.disclosed_result;
  const humanLabel = disclosed
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: pack.id,
    displayName: pack.display_name,
    question: pack.holder_explanation.split(".")[0] ?? pack.display_name,
    disclosedResult: disclosed,
    disclosedLabel: humanLabel,
    protectedFields: normalizeProtected(pack),
    partnerReceives: pack.partner_receives,
    reuseNote:
      pack.reuse_policy === "time_bound"
        ? "Reuse depends on evidence freshness, assurance, policy compatibility, consent, and current validity."
        : "Reuse depends on session scope, consent, and current validity.",
    sandboxOnly: policyPackIsSandboxOnly(pack),
    minimumAssurance: pack.minimum_assurance,
    receiptLifetimeHours: pack.receipt_lifetime_hours,
  };
}

/** Policies suitable for the public interactive Protocol in Action selector. */
export const PROTOCOL_FLOW_POLICIES: ProtocolFlowPolicyView[] = POLICY_PACK_LIST.filter(
  (pack) => !policyPackIsSandboxOnly(pack),
)
  .map(toPolicyView)
  .sort((a, b) => {
    if (a.id === "age_21_retail") return -1;
    if (b.id === "age_21_retail") return 1;
    return a.displayName.localeCompare(b.displayName);
  });

export const DEFAULT_PROTOCOL_POLICY =
  PROTOCOL_FLOW_POLICIES.find((p) => p.id === "age_21_retail") ?? PROTOCOL_FLOW_POLICIES[0];

export function resolveProtocolFlowPolicy(id: PolicyPackId): ProtocolFlowPolicyView {
  const found = PROTOCOL_FLOW_POLICIES.find((p) => p.id === id);
  if (found) return found;
  const pack = POLICY_PACK_LIST.find((p) => p.id === id);
  return pack ? toPolicyView(pack) : DEFAULT_PROTOCOL_POLICY;
}

/** Traditional model apps that repeatedly collect identity data. */
export const TRADITIONAL_REPEAT_APPS = ["App A", "App B", "App C"] as const;

export const TRADITIONAL_LEAK_FIELDS = [
  "Date of birth",
  "Identity document",
  "Personal information",
  "Verification",
] as const;
