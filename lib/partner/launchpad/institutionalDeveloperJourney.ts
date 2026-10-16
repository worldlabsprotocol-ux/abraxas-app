// FILE: lib/partner/launchpad/institutionalDeveloperJourney.ts
// Canonical external institutional developer progression (Build #591).

import {
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
  INSTITUTIONAL_SANDBOX_STUDIO_HREF,
  INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
  INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";

export const INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION = "591.v1" as const;

export type InstitutionalDeveloperJourneyStepId =
  | "understand_product"
  | "sandbox_application"
  | "policy_and_relying_app"
  | "sdk_distribution"
  | "verification_request"
  | "signed_receipt"
  | "independent_verify"
  | "production_authorization";

export interface InstitutionalDeveloperJourneyStep {
  id: InstitutionalDeveloperJourneyStepId;
  order: number;
  title: string;
  detail: string;
  href: string;
  action_label: string;
}

export const INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS: InstitutionalDeveloperJourneyStep[] = [
  {
    id: "understand_product",
    order: 1,
    title: "Understand verification and integration model",
    detail:
      "Review the institutional verification contract, offline trust pins, and inspect-vs-authorize semantics before writing integration code.",
    href: "/developers/institutional-verification",
    action_label: "Institutional verification SDK",
  },
  {
    id: "sandbox_application",
    order: 2,
    title: "Create or access an authorized sandbox application",
    detail:
      "Provision a Launchpad application pinned to sandbox_institutional_protocol_access, or open Integration Studio with the institutional pack.",
    href: INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
    action_label: "Institutional Launchpad",
  },
  {
    id: "policy_and_relying_app",
    order: 3,
    title: "Select policy and configure the relying application",
    detail:
      "Bind partner_id and policy_id, allowlist HTTPS callbacks, and deploy starter kit files for your test environment.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "Integration workspace",
  },
  {
    id: "sdk_distribution",
    order: 4,
    title: "Obtain the controlled verification SDK",
    detail:
      "Install the founder-approved tarball for your tenant when entitled. Pin digest v2 receipt key material on your infrastructure.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "SDK delivery",
  },
  {
    id: "verification_request",
    order: 5,
    title: "Make an authorized verification request",
    detail:
      "Run hosted holder verification or initiate Partner Flow from your server using sandbox credentials.",
    href: INSTITUTIONAL_SANDBOX_STUDIO_HREF,
    action_label: "Hosted verification",
  },
  {
    id: "signed_receipt",
    order: 6,
    title: "Obtain the signed, policy-bound decision receipt",
    detail:
      "Receive the holder-authorized receipt through your callback or authorized Partner API — not a synthetic UI fixture.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "Receipt outcome",
  },
  {
    id: "independent_verify",
    order: 7,
    title: "Verify independently with pinned issuer trust",
    detail:
      "Run verifySignedDecisionReceipt on your backend with durable replay storage and authenticated revocation evidence.",
    href: INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
    action_label: "Independent verifier guide",
  },
  {
    id: "production_authorization",
    order: 8,
    title: "Request Production authorization",
    detail:
      "Production signing, credentials, and tenant activation require explicit operator review — sandbox success does not auto-promote.",
    href: INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
    action_label: "Sandbox-to-production handoff",
  },
];

export function institutionalDeveloperJourneyStep(id: InstitutionalDeveloperJourneyStepId): InstitutionalDeveloperJourneyStep {
  const step = INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS.find((row) => row.id === id);
  if (!step) throw new Error(`unknown_journey_step:${id}`);
  return step;
}
