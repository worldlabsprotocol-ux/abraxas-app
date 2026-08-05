// FILE: lib/integrationReadiness.ts
// Evidence-based integration readiness status — docs / roadmap reconciliation (post PR #115).

export type IntegrationStatusId = "live" | "beta_ready" | "blocked" | "later";

export interface IntegrationStatusSection {
  id: IntegrationStatusId;
  phase: string;
  emoji: string;
  color: string;
  description: string;
  items: readonly string[];
}

export const INTEGRATION_READINESS_DOC = "docs/INTEGRATION_READINESS_RECONCILIATION.md";

export const CANONICAL_PRODUCTION_ORIGIN = "https://abraxasworld.xyz";

export const PARTNER_INTEGRATION_PATHS = {
  integratorGuide: "/docs/partner-flow",
  openApiDocs: "/docs/partner-flow-api",
  openApiYaml: "/openapi/partner-flow.openapi.yaml",
  onboardingChecklist: "docs/PARTNER_ONBOARDING_CHECKLIST.md",
} as const;

/** How another protocol integrates — public doc links (relative site paths). */
export const HOW_TO_INTEGRATE_STEPS = [
  {
    step: 1,
    title: "Read the integrator guide",
    href: PARTNER_INTEGRATION_PATHS.integratorGuide,
    detail: "Partner Flow sequence, browser session model, callback contract.",
  },
  {
    step: 2,
    title: "Review the OpenAPI contract",
    href: PARTNER_INTEGRATION_PATHS.openApiDocs,
    detail: "Machine-readable paths under /api/v1/partner-flow/* and receipt verification.",
  },
  {
    step: 3,
    title: "Download the OpenAPI YAML",
    href: PARTNER_INTEGRATION_PATHS.openApiYaml,
    detail: "Canonical server: abraxasworld.xyz — use for codegen and CI contract tests.",
  },
  {
    step: 4,
    title: "Complete the onboarding checklist",
    href: PARTNER_INTEGRATION_PATHS.integratorGuide,
    detail: "Operator steps in docs/PARTNER_ONBOARDING_CHECKLIST.md — partner row, policy, allowed_return_urls.",
  },
] as const;

export const INTEGRATION_WIRING_CHECKLIST = [
  {
    id: "partner-row",
    label: "Partner row exists in production Supabase (`partners`)",
    owner: "operator",
  },
  {
    id: "policy-active",
    label: "Active `partner_policies` row bound to partner_id",
    owner: "operator",
  },
  {
    id: "return-urls",
    label: "`allowed_return_urls` includes exact production callback URLs (fail-closed)",
    owner: "operator",
  },
  {
    id: "issuer-origin",
    label: "`ABRAXAS_ISSUER_URL` and JWKS issuer match abraxasworld.xyz",
    owner: "operator",
  },
  {
    id: "signing-keys",
    label: "Signing configured (`/api/trust/status` → signing_configured: true)",
    owner: "operator",
  },
  {
    id: "browser-session",
    label: "Holder browser session secret configured for partner-flow routes",
    owner: "operator",
  },
  {
    id: "migrations",
    label: "Migrations 053 (idempotency) and 054 (audit index) applied in target DB",
    owner: "operator",
  },
  {
    id: "redirect-link",
    label: "Partner site links to /partner/verify with partner_id, policy_id, return_url",
    owner: "integrator",
  },
  {
    id: "callback-verify",
    label: "Partner backend verifies receipt via public or authenticated receipt API",
    owner: "integrator",
  },
  {
    id: "preflight-pass",
    label: "`npm run integration:preflight` PASS with production URL + read-only Supabase",
    owner: "engineering",
  },
] as const;

export const RELEASE_GATE_CHECKLIST = [
  { id: "iat", label: "Institutional Acceptance Test (IAT) signed in PRODUCTION_WALKTHROUGH_RESULTS.md", blocked: true },
  { id: "external-review", label: "Independent external security review report + disposition", blocked: true },
  { id: "beta-tag", label: "Tag v1.0.0-beta.0 (not created)", blocked: true },
  { id: "protocol-freeze", label: "PROTOCOL_COMPATIBILITY.md + manifest contract tests at release SHA", blocked: false },
  { id: "release-decision", label: "RELEASE_DECISION.md signed", blocked: true },
] as const;

/**
 * Criteria for calling **integration wiring** complete (distinct from release gates).
 * All wiring items must be evidenced; release gates may still be open.
 */
export const INTEGRATION_WIRING_COMPLETE_CRITERIA = [
  "All INTEGRATION_WIRING_CHECKLIST items verified with operator evidence (Supabase row screenshots or preflight PASS).",
  "End-to-end pilot flow exercised: evaluate → (passport path if needed) → complete or refresh → partner callback with receipt_id.",
  "Receipt validation succeeds: GET /api/receipts/{id}/public returns signature_valid: true on production.",
  "Return URL allowlist rejects non-listed callbacks (fail-closed probe documented).",
  "integration:preflight exits 0 with INTEGRATION_PREFLIGHT_BASE_URL=https://abraxasworld.xyz and read-only service role.",
  "No stale abraxas-app.vercel.app issuer or redirect in the partner's live callback path.",
] as const;

export const INTEGRATION_STATUS_SECTIONS: readonly IntegrationStatusSection[] = [
  {
    id: "live",
    phase: "Live today",
    emoji: "✅",
    color: "#10B981",
    description: "Merged to main and available on abraxasworld.xyz (beta deployment).",
    items: [
      "Partner Flow integration kit + OpenAPI contract (abraxasworld.xyz)",
      "Partner Flow evaluate / complete / refresh APIs",
      "Fail-closed partner return URL allowlist",
      "Public + partner-authenticated receipt verification",
      "P1-2 fail-closed trust evaluation + server-derived idempotency (PR #113)",
      "P1-3 partner-flow audit metadata + trace analyzer (PR #114)",
      "Integration preflight script (npm run integration:preflight)",
      "External security-review readiness package (docs only, PR #115)",
      "Google zkLogin + browser session for holder routes",
      "Good Trouble hosted pilot checkout UI (/good-trouble/*)",
    ],
  },
  {
    id: "beta_ready",
    phase: "Beta-ready — pending human evidence",
    emoji: "🧪",
    color: "#0EA5E9",
    description: "Code and operator tooling exist; production sign-off or pilot evidence still required.",
    items: [
      "Good Trouble pilot/sandbox integration (not GA production policy until evidenced)",
      "Production IAT scenarios A–D (walkthrough checklist exists; results unsigned)",
      "Partner-flow trace audit on real flow_trace_id (CLI ready; operator must run)",
      "Refresh replacement receipt cycles on live expired receipts",
      "Second relying party self-serve onboarding",
    ],
  },
  {
    id: "blocked",
    phase: "Release gates — pending / blocked",
    emoji: "⛔",
    color: "#F59E0B",
    description: "Explicit gates that must not be marked complete without signed evidence.",
    items: [
      "Institutional Acceptance Test (IAT) — NOT complete",
      "Independent external security review — NOT complete",
      "v1.0.0-beta.0 baseline tag — NOT created",
      "PROTOCOL_COMPATIBILITY freeze sign-off — code complete; IAT evidence pending",
      "RELEASE_DECISION.md — draft only",
      "P1-1 immutable policy versions — code merged; apply migration 055 in Supabase",
    ],
  },
  {
    id: "later",
    phase: "Later / out of scope (current cycle)",
    emoji: "🔭",
    color: "#6366F1",
    description: "Intentionally deferred; not required for first pilot wiring.",
    items: [
      "On-chain Move passport mainnet",
      "MoonPay / fiat ramp production",
      "Self-serve partner dashboard",
      "Rate limiting at edge",
      "P1-4 biometric telemetry persistence",
      "General availability (GA) marketing claim",
    ],
  },
] as const;

export function isLiveIntegrationPhase(phase: string): boolean {
  return phase === "Live today";
}
