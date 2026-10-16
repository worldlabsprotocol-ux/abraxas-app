// FILE: lib/partner/launchpad/institutionalDeveloperJourney.ts
// Canonical external institutional developer progression (Build #591).

import {
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
  INSTITUTIONAL_SANDBOX_STUDIO_HREF,
  INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
  INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";

export const INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION = "591.v2" as const;

export type InstitutionalDeveloperJourneyStepId =
  | "understand_product"
  | "enter_sandbox"
  | "sandbox_application"
  | "policy_and_relying_app"
  | "sdk_distribution"
  | "configure_trust"
  | "signed_receipt"
  | "independent_verify"
  | "review_evidence_and_production";

export interface InstitutionalDeveloperJourneyStep {
  id: InstitutionalDeveloperJourneyStepId;
  order: number;
  title: string;
  detail: string;
  href: string;
  action_label: string;
}

/** Institutional protocol verification — not age-gated Partner Flow commerce. */
export const INSTITUTIONAL_JOURNEY_SCOPE_NOTICE =
  "This sequence is for institutional protocol access and signed decision receipts. Age-gated commerce Partner Flow remains a separate integration path." as const;

export const INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS: InstitutionalDeveloperJourneyStep[] = [
  {
    id: "understand_product",
    order: 1,
    title: "Understand Abraxas institutional verification",
    detail:
      "Review inspect-vs-authorize semantics, offline issuer trust pins, portable revocation, and replay requirements before integrating.",
    href: "/developers/institutional-verification",
    action_label: "Verification SDK docs",
  },
  {
    id: "enter_sandbox",
    order: 2,
    title: "Enter the institutional sandbox",
    detail:
      "Open Integration Studio with the institutional protocol access pack to review policy fit and sandbox boundaries.",
    href: INSTITUTIONAL_SANDBOX_STUDIO_HREF,
    action_label: "Institutional sandbox studio",
  },
  {
    id: "sandbox_application",
    order: 3,
    title: "Create or resume an authorized application",
    detail:
      "Provision or select a Launchpad application pinned to sandbox_institutional_protocol_access for your partner tenant.",
    href: INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
    action_label: "Partner Launchpad",
  },
  {
    id: "policy_and_relying_app",
    order: 4,
    title: "Bind the institutional policy and relying application",
    detail:
      "Confirm partner_id and policy_id, allowlist HTTPS callbacks, and deploy starter kit integration files.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "Integration workspace",
  },
  {
    id: "sdk_distribution",
    order: 5,
    title: "Obtain the controlled verification SDK",
    detail:
      "Install the founder-approved tarball when your tenant entitlement allows. Request access if download is not yet granted.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "SDK delivery",
  },
  {
    id: "configure_trust",
    order: 6,
    title: "Configure pinned issuer trust",
    detail:
      "Ship ABRAXAS_RECEIPT_VERIFICATION_REGISTRY offline and pin digest v2 receipt key material on your infrastructure.",
    href: "/developers/institutional-verification#trust-material",
    action_label: "Trust configuration",
  },
  {
    id: "signed_receipt",
    order: 7,
    title: "Receive an authorized sandbox decision receipt",
    detail:
      "Complete hosted holder verification and obtain the signed receipt through your callback or authorized Partner API.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "Receipt evidence",
  },
  {
    id: "independent_verify",
    order: 8,
    title: "Verify independently in your backend",
    detail:
      "Run verifySignedDecisionReceipt with durable replay storage and authenticated portable revocation — not Abraxas Supabase as trust root.",
    href: INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
    action_label: "Independent verifier guide",
  },
  {
    id: "review_evidence_and_production",
    order: 9,
    title: "Review verification evidence and request Production",
    detail:
      "Use integration telemetry and export when events exist. Production signing and credentials require explicit operator authorization.",
    href: INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
    action_label: "Production authorization handoff",
  },
];

export function institutionalDeveloperJourneyStep(id: InstitutionalDeveloperJourneyStepId): InstitutionalDeveloperJourneyStep {
  const step = INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS.find((row) => row.id === id);
  if (!step) throw new Error(`unknown_journey_step:${id}`);
  return step;
}
