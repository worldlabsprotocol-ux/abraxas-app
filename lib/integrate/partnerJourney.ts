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

export const INTEGRATOR_START_HERE_STEPS: IntegratorStartStep[] = [
  {
    step: 1,
    title: "Apply and get approved",
    body:
      "Submit a design partner application for age-gated digital commerce. Abraxas reviews applications manually — there is no self-serve production portal or automatic API-key issuance.",
    cta: { label: "Apply for review", href: "/integrations#apply" },
    availability: "now",
  },
  {
    step: 2,
    title: "Review Partner Flow docs",
    body:
      "Read the browser-redirect contract, frozen callback parameters, and the server-side receipt verification flow your backend must implement.",
    cta: { label: "Partner Flow docs", href: "/docs/partner-flow" },
    availability: "now",
  },
  {
    step: 3,
    title: "Use sandbox when provisioned",
    body:
      "After approval, operators may provision sandbox policies and test credentials. Sandbox receipts are not production-usable unless your validator explicitly opts in with allowSandbox.",
    cta: { label: "Receipt tester", href: "/verify?mode=receipt" },
    availability: "after_approval",
  },
  {
    step: 4,
    title: "Implement server-side receipt verification",
    body:
      "On callback, your server fetches GET /api/receipts/{receipt_id}/public, validates signature and policy binding, and only then grants gated access.",
    cta: { label: "Test a receipt ID", href: "/verify?mode=receipt" },
    availability: "now",
  },
];

export const INTEGRATOR_SANDBOX_BOUNDARY = {
  sandboxLabel: "Sandbox (pilot / test policies)",
  sandboxDetail:
    "May be issued after manual approval. Receipts from sandbox policies require allowSandbox in your validator. Not valid for production gates.",
  productionLabel: "Production (operator-provisioned)",
  productionDetail:
    "Requires approved partner row, active policy, allowlisted callback URLs, and production_usable receipts. No self-serve provisioning.",
} as const;

export const PARTNER_FLOW_CONFORMANCE_COMMAND = `PARTNER_FLOW_RP_PARTNER_ID=your-partner-id \\
PARTNER_FLOW_RP_POLICY_ID=your-policy-v1 \\
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \\
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\
npm run partner:conformance`;

export const PARTNER_FLOW_FIRST_TASKS = [
  "Apply at /integrations#apply — describe your age-gated checkout or eligibility gate.",
  "Read /docs/partner-flow — entry URL params, lifecycle, and receipt checks.",
  "Implement callback handler — fetch public receipt server-side; never trust URL params alone.",
  "Run npm run partner:conformance after operators provision partner_id, policy_id, and return_url.",
] as const;
