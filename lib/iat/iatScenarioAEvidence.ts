// FILE: lib/iat/iatScenarioAEvidence.ts
// Scenario A evidence template — fields filled by humans after browser execution.

export interface ScenarioAEvidenceTemplate {
  scenario: "A";
  title: string;
  description: string;
  /** Not claimed complete by automated runner. */
  automated_only: true;
  iat_pass_claimed: false;
  fields: {
    verification_request_id: string | null;
    flow_trace_id: string | null;
    consent_recorded: boolean | null;
    admin_approval_recorded: boolean | null;
    residency_country_in_claims: string | null;
    decision_id: string | null;
    receipt_id: string | null;
    signature_valid: boolean | null;
    callback_url_captured: string | null;
    audit_rows: Array<{
      action: string;
      flow_trace_id: string | null;
      outcome: string | null;
      created_at: string | null;
    }>;
  };
  human_steps_required: ScenarioAHumanStep[];
}

export interface ScenarioAHumanStep {
  step: number;
  id: string;
  label: string;
  reason: string;
}

/** Steps that cannot be automated safely — browser, OAuth, capture, admin approval. */
export const SCENARIO_A_HUMAN_STEPS: ScenarioAHumanStep[] = [
  {
    step: 1,
    id: "land-good-trouble",
    label: "Land on /good-trouble and confirm Continue with Abraxas",
    reason: "Requires human browser verification of pilot checkout UI",
  },
  {
    step: 2,
    id: "click-continue-abraxas",
    label: "Click Continue with Abraxas → /partner/verify",
    reason: "Requires human browser navigation; no automated sign-in",
  },
  {
    step: 3,
    id: "zklogin-google",
    label: "Sign in with Google (zkLogin session cookie)",
    reason: "OAuth sign-in cannot be automated in read-only IAT companion",
  },
  {
    step: 4,
    id: "partner-evaluate-passport",
    label: "POST /api/v1/partner-flow/evaluate → next: passport",
    reason: "Requires authenticated browser session; capture verification_request_id",
  },
  {
    step: 5,
    id: "passport-redirect",
    label: "Redirect to /passport with verify_request param",
    reason: "Human follows redirect and confirms URL params",
  },
  {
    step: 6,
    id: "consent-ceremony",
    label: "Complete consent ceremony (POST …/consent)",
    reason: "Requires holder consent — cannot be scripted without creating verification requests in automation",
  },
  {
    step: 7,
    id: "identity-document-capture",
    label: "Upload ID document (POST /api/identity/documents/capture)",
    reason: "Requires real identity document capture — human only",
  },
  {
    step: 8,
    id: "biometric-capture",
    label: "Upload selfie / biometric capture",
    reason: "Requires live biometric capture — human only",
  },
  {
    step: 9,
    id: "admin-approval",
    label: "Admin approves identity (POST /api/admin/identity/approve)",
    reason: "Requires privileged admin session — operator human step",
  },
  {
    step: 10,
    id: "credential-issued",
    label: "Confirm credential issued (abraxas_credentials row / metrics)",
    reason: "Requires Supabase or metrics inspection after approval",
  },
  {
    step: 11,
    id: "partner-complete-auto",
    label: "Observe PartnerFlowReturnHandler → POST /api/v1/partner-flow/complete",
    reason: "Requires authenticated browser session during flow",
  },
  {
    step: 12,
    id: "enter-callback-redirect",
    label: "Redirect to /good-trouble/enter with callback query params",
    reason: "Human captures callback URL (no PII)",
  },
  {
    step: 13,
    id: "receipt-signature-valid",
    label: "GET /api/receipts/{receipt_id}/public → signature_valid: true",
    reason: "Requires receipt_id from completed flow — fill after step 12",
  },
  {
    step: 14,
    id: "callback-url-inspection",
    label: "Inspect callback URL for frozen params only (no PII)",
    reason: "Human verifies callback shape against protocol contract",
  },
  {
    step: 15,
    id: "trust-decision-fetch",
    label: "GET /api/v1/verify/decisions/{decision_id} with partner API key",
    reason: "Requires partner API key — never automated in read-only runner",
  },
  {
    step: 16,
    id: "audit-trace-query",
    label: "Run npm run audit:partner-flow-trace -- ft_vr_{verification_request_id}",
    reason: "Requires completed flow IDs and Supabase service role credentials",
  },
];

export function emptyScenarioAEvidenceTemplate(): ScenarioAEvidenceTemplate {
  return {
    scenario: "A",
    title: "Scenario A — New user → regulated purchase",
    description:
      "Evidence template for human execution. Automated runner does NOT fill these fields and does NOT claim IAT pass.",
    automated_only: true,
    iat_pass_claimed: false,
    fields: {
      verification_request_id: null,
      flow_trace_id: null,
      consent_recorded: null,
      admin_approval_recorded: null,
      residency_country_in_claims: null,
      decision_id: null,
      receipt_id: null,
      signature_valid: null,
      callback_url_captured: null,
      audit_rows: [],
    },
    human_steps_required: SCENARIO_A_HUMAN_STEPS,
  };
}
