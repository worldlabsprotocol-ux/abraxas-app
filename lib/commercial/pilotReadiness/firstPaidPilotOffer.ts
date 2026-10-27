// FILE: lib/commercial/pilotReadiness/firstPaidPilotOffer.ts
// Build 875 — one focused paid pilot structure (sandbox + existing verification infra only).

export type PilotSecurityRequirement = {
  id: string;
  requirement: string;
  evidenceSource: string;
  productionGate: boolean;
};

export type FirstPaidPilotOffer = {
  id: string;
  title: string;
  intendedOrganizationType: string;
  verificationUseCase: string;
  integrationRequirements: string[];
  securityControls: PilotSecurityRequirement[];
  proposedDurationDays: number;
  usageMeasurement: string[];
  supportBoundaries: string[];
  acceptanceCriteria: string[];
  productionAuthorizationConditions: string[];
  explicitNonPromises: string[];
};

export const FIRST_PAID_PILOT_OFFER: FirstPaidPilotOffer = {
  id: "wallet_control_portable_enforcement_pilot",
  title: "Scoped paid pilot — independent receipt enforcement for wallet-gated access",
  intendedOrganizationType:
    "Digital platform or marketplace operator (age-gated commerce, membership, or high-trust gating) with an engineering team that can run a server-side integration.",
  verificationUseCase:
    "Holder completes wallet-control verification once per policy; partner application creates handoff, receives callback, fetches portable bundle, verifies with pinned Demo trust anchor, and enforces permit/deny/indeterminate in their own runtime.",
  integrationRequirements: [
    "HTTPS callback URL allowlisted on Demo sandbox application",
    "Server-side API key custody (never in browser)",
    "Integration via POST /api/v1/partner-handoff + portable export OR examples/external-node-partner reference",
    "Independent verify + enforce using @abraxas/independent-verifier (pinned trust anchor out-of-band)",
    "Launchpad sandbox only — separate Production promotion per existing review controls",
  ],
  securityControls: [
    {
      id: "independent_verify",
      requirement: "Integrator verifies receipts independently; Abraxas hosted UI is not the enforcement point",
      evidenceSource: "Partner demo: portable verify + enforce artifact or IAT row",
      productionGate: true,
    },
    {
      id: "freshness_fail_closed",
      requirement: "Stale issuer/status cannot authorize (Build 870 semantics)",
      evidenceSource: "external-node-partner enforce tests + partner enforcement logs",
      productionGate: true,
    },
    {
      id: "tenant_scope",
      requirement: "API credentials scoped to application; cross-tenant handoff denied",
      evidenceSource: "Build 866/873 isolation evidence or partner audit",
      productionGate: true,
    },
    {
      id: "operational_recovery",
      requirement: "Documented path for evidence outage and signing rotation (operator drills)",
      evidenceSource: "Build 874 gap audit — deployed_demo tier before Production for regulated buyers",
      productionGate: true,
    },
    {
      id: "no_pii_metering",
      requirement: "Usage counted without wallet/email in metering payload",
      evidenceSource: "partnerMetering.ts guards + metering row review",
      productionGate: false,
    },
  ],
  proposedDurationDays: 90,
  usageMeasurement: [
    "partner_metering_events: partner_flow_receipt_issued (approved receipt idempotency key)",
    "partner_metering_events: partner_api_call (deduped authenticated API usage)",
    "partner_api_usage rows (endpoint-level, best-effort)",
    "Pilot report: repeat verifications vs one-time setup (operator query — no automatic invoice)",
  ],
  supportBoundaries: [
    "Abraxas: sandbox provisioning guidance, allowlist/callback troubleshooting, portable export availability on Demo",
    "Partner: holder UX in their product, callback server, independent verify/enforce, production security review of their stack",
    "Out of scope: custom policy legal approval, guaranteed SLA, Production data residency commitments beyond published docs",
  ],
  acceptanceCriteria: [
    "Partner completes START_HERE / ADOPTION_RUNBOOK without founder implementing their app",
    "At least one end-to-end verification with signed receipt and integrator-side permit enforcement",
    "Demonstrated deny or indeterminate on misconfiguration or adversarial test (wrong audience or stale fixture)",
    "Recorded setup time, operator assists, and repeat verification count",
    "Signed evaluation or pilot agreement (legal — outside repo)",
  ],
  productionAuthorizationConditions: [
    "Existing Launchpad production review and policy approval workflow completed",
    "Build 874 deployed operational evidence tier met for buyer-required controls (or explicit risk acceptance documented)",
    "Trust anchor promotion and environment separation Demo → Production verified",
    "No bypass of issuer authority, evidence validity, or independent verification requirements",
  ],
  explicitNonPromises: [
    "No guaranteed verification latency or SLA in pilot",
    "No automatic Production access upon pilot payment",
    "No compliance certification or regulatory approval implied",
    "Pricing estimates on /pricing are not invoices and do not enable collection in product",
  ],
};

export function describeFirstPaidPilotOffer(): FirstPaidPilotOffer {
  return FIRST_PAID_PILOT_OFFER;
}
