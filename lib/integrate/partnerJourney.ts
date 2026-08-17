// FILE: lib/integrate/partnerJourney.ts
// Shared integrator journey copy — Partner Flow start path (UI only).

export type IntegratorAvailability = "now" | "after_approval" | "operator_provisioned";

export interface IntegratorStartStep {
  step: number;
  title: string;
  body: string;
  cta: { label: string; href: string };
  availability: IntegratorAvailability;
}

/** Canonical design-partner application destination for all partner-facing surfaces. */
export const PARTNER_APPLICATION_PATH = "/integrations#apply";

export const HOLDER_VERIFY_DEFAULT_PATH = "/passport?view=verify&mode=registry";

export const PARTNER_RECEIPT_VERIFIER_PATH = "/verify?mode=receipt";

export const PARTNER_FLOW_DOCS_PATH = "/docs/partner-flow";

export const PARTNER_RECEIPT_DOCS_ANCHOR = "/docs/partner-flow#receipt-verification";

export const VERIFY_HUB_EYEBROW = "Partner integrators · public beta";

export const VERIFY_HUB_HEADLINE = "Test a Partner Flow session receipt";

export const VERIFY_HUB_SUBHEAD =
  "Paste a receipt_id from your callback and inspect the public receipt view. In production, your server must call GET /api/receipts/{receipt_id}/public and validate the signed result before granting access.";

export const VERIFY_HUB_HOLDER_NOTE =
  "Looking for registry or credential tools? Open holder verify in Passport — not Partner Flow receipt verification.";

export const HOLDER_VERIFY_EYEBROW = "Passport tools · public beta";

export const HOLDER_VERIFY_HEADLINE = "Look up your records and credentials";

export const HOLDER_VERIFY_SUBHEAD =
  "Look up public registry records or test a credential JWT against documented claims. This is not Partner Flow receipt verification.";

export const HOLDER_PARTNER_RECEIPT_LINK_LABEL = "Open the partner receipt tester";

export const PARTNER_RECEIPT_SERVER_STEP =
  "On callback, your server fetches GET /api/receipts/{receipt_id}/public, validates signature and policy binding, and only then grants gated access.";

export const PARTNER_CONVERSION_FORBIDDEN_TERMS = [
  "kyc",
  "compliance certified",
  "audited",
  "soc ",
  "iso ",
  "thousands of",
  "self-serve production",
  "automatic api-key",
  "automatic api key",
  "live integrations",
] as const;

export const INTEGRATOR_START_HERE_STEPS: IntegratorStartStep[] = [
  {
    step: 1,
    title: "Apply for manual review",
    body:
      "Submit a design partner application for age-gated digital commerce. Abraxas operators review applications manually — there is no self-serve production portal and no automatic API-key issuance.",
    cta: { label: "Apply for review", href: PARTNER_APPLICATION_PATH },
    availability: "now",
  },
  {
    step: 2,
    title: "Read the Partner Flow contract",
    body:
      "Read the browser-redirect contract, frozen callback parameters, and the server-side receipt verification checks your backend must implement.",
    cta: { label: "Partner Flow docs", href: PARTNER_FLOW_DOCS_PATH },
    availability: "now",
  },
  {
    step: 3,
    title: "Use sandbox when provisioned",
    body:
      "After approval, operators may provision sandbox policies and callback allowlists. Test with the receipt tester using operator-provided receipt IDs. Sandbox receipts are not production-usable unless your validator explicitly opts in with allowSandbox.",
    cta: { label: "Receipt tester", href: PARTNER_RECEIPT_VERIFIER_PATH },
    availability: "after_approval",
  },
  {
    step: 4,
    title: "Verify on your server before access",
    body: `${PARTNER_RECEIPT_SERVER_STEP} Use the receipt tester only as a public mirror of that check.`,
    cta: { label: "Test a receipt ID", href: PARTNER_RECEIPT_VERIFIER_PATH },
    availability: "now",
  },
];

export const INTEGRATOR_SANDBOX_BOUNDARY = {
  sandboxLabel: "Sandbox (operator-provisioned test policies)",
  sandboxDetail:
    "May be issued after manual approval. Receipts from sandbox policies require allowSandbox in your validator. Not valid for production gates.",
  productionLabel: "Production (operator-provisioned)",
  productionDetail:
    "Requires approved partner row, active policy, allowlisted callback URLs, and production_usable receipts. No self-serve provisioning.",
  receiptTesterLabel: "Partner Flow receipt tester",
  receiptTesterDetail:
    "Paste a receipt_id from your callback and mirror the server-side GET /api/receipts/{receipt_id}/public check.",
  registryDemoLabel: "Registry record demo (separate)",
  registryDemoDetail:
    "Public registry showcase only — not a Partner Flow session receipt. Use the receipt tester for callback artifacts.",
} as const;

export const PARTNER_FLOW_CONFORMANCE_COMMAND = `PARTNER_FLOW_RP_PARTNER_ID=your-partner-id \\
PARTNER_FLOW_RP_POLICY_ID=your-policy-v1 \\
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \\
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\
npm run partner:conformance`;

export const PARTNER_FLOW_FIRST_TASKS = [
  `Apply at ${PARTNER_APPLICATION_PATH} — describe your age-gated checkout or eligibility gate.`,
  "Read /docs/partner-flow — entry URL params, lifecycle, and receipt checks.",
  "Implement callback handler — fetch public receipt server-side; never trust URL params alone.",
  "Run npm run partner:conformance after operators provision partner_id, policy_id, and return_url.",
] as const;
