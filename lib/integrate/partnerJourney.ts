// FILE: lib/integrate/partnerJourney.ts
// Shared integrator journey copy — Partner Flow start path (UI only).

export type IntegratorAvailability = "now" | "production_review" | "optional";

export interface IntegratorStartStep {
  step: number;
  title: string;
  body: string;
  cta: { label: string; href: string };
  availability: IntegratorAvailability;
}

/** Canonical self-service sandbox entry points. */
export const CANONICAL_SANDBOX_STUDIO_PATH = "/developers/integration-studio";
export const CANONICAL_SANDBOX_LAUNCHPAD_PATH = "/developers/launchpad";
export const DESIGN_PARTNER_PATH = "/design-partner";

/** Canonical design-partner application destination for relationship-track intake. */
export const PARTNER_APPLICATION_PATH = "/integrations#apply";

export const CANONICAL_SANDBOX_SUMMARY =
  "Create a sandbox application in Integration Studio or Partner Launchpad and receive a one-time abx_test_* credential. Store it server-side only. Production access is not granted automatically.";

export const PRODUCTION_ACCESS_NOTE =
  "Production access requires reviewed activation: complete sandbox readiness in Launchpad, submit a production request, and pass Abraxas operator review. Live abx_live_* credentials are issued only after approval.";

export const PARTNER_FLOW_SANDBOX_STEPS = [
  "Open Integration Studio or Partner Launchpad.",
  "Choose and configure an eligibility policy for your use case.",
  "Create a sandbox application and copy the one-time abx_test_* API key.",
  "Store the credential server-side only; never expose it in client bundles.",
  "Configure your allowed HTTPS callback URL on the application.",
  "Create a hosted handoff from your backend (POST /api/v1/partner-handoff).",
  "Redirect the holder to hosted_url; verify the current result server-side before granting access.",
] as const;

export const HOLDER_VERIFY_DEFAULT_PATH = "/passport?view=verify&mode=registry";

export const HOLDER_VERIFY_CREDENTIAL_PATH = "/passport?view=verify&mode=credential";

export const PARTNER_RECEIPT_VERIFIER_PATH = "/verify?mode=receipt";

export const NAV_PARTNER_VERIFY_LABEL = "Partner verify";

export const HOLDER_ACCOUNT_EYEBROW = "Account · public beta";

export const HOLDER_ACCOUNT_TITLE = "Your Passport status";

export const HOLDER_ACCOUNT_SUBHEAD =
  "Summary of your wallet, verification progress, and shortcuts to Passport tools.";

export const HOLDER_ACCOUNT_SIGNED_OUT_TITLE = "Your Abraxas account";

export const HOLDER_ACCOUNT_SIGNED_OUT_SUBHEAD =
  "Sign in with Google to see your wallet address and open Passport for setup and verification tools.";

export const HOLDER_ACCOUNT_ERROR_TITLE = "Status unavailable";

export const HOLDER_ACCOUNT_ERROR_BODY =
  "Could not load your current Passport status. Check your connection and try again, or open Passport directly.";

export const HOLDER_VERIFIED_HERO_SECONDARY_CTA = "Test my credential JWT";

export const FOOTER_TAGLINE =
  "Reusable identity and proof for partner flows. Optional identity verification when a policy requires it.";

export const FOOTER_PASSPORT_TOOLS_LABEL = "Passport tools";

export const DASHBOARD_LEGACY_EYEBROW = "Legacy URL · public beta";

export const DASHBOARD_LEGACY_TITLE = "This dashboard has moved";

export const DASHBOARD_LEGACY_BODY =
  "The old /dashboard page showed browser-only drafts and demo pipeline views that did not reflect your live Passport status. Use Passport for wallet binding, identity review, credentials, and holder verify tools.";

export const DASHBOARD_LEGACY_CTA = "Open Passport →";

export const BOTTOM_NAV_ACCOUNT_LABEL = "Account";

export const BOTTOM_NAV_ACCOUNT_HREF = "/account";

export const PAYMENT_RETURN_EYEBROW = "Checkout return · public beta";

export const PAYMENT_RETURN_HEADLINE = "Next steps";

export const PAYMENT_RETURN_LEAD =
  "If your payment completed, check your email for a receipt and next steps.";

export const PAYMENT_RETURN_UNKNOWN_PRODUCT_LABEL = "Your selected product";

export const PAYMENT_RETURN_DEFAULT_STEPS = [
  "If your payment completed, check your email for a receipt and any intake instructions.",
  "Open Passport to bind your wallet and review verification status.",
  "Use Build to submit asset documents when you are ready.",
  "This beta has no self serve case tracker. Follow email instructions for updates.",
] as const;

export const PAYMENT_RETURN_PRIMARY_CTA = "Open Passport →";

export const PAYMENT_RETURN_SECONDARY_CTA = "Back to home";

export const PAYMENT_RETURN_SECONDARY_HREF = "/";

export const APPLE_WALLET_EYEBROW = "Apple Wallet · beta";

export const APPLE_WALLET_HEADLINE = "Apple Wallet passes are not available in this beta.";

export const APPLE_WALLET_BODY =
  "Use Passport to review your records or test a credential JWT. Partner receipt verification is a separate integrator tool.";

export const APPLE_WALLET_FETCH_ERROR = "Could not reach the wallet pass service. Check your connection and try again.";

export const APPLE_WALLET_RETRY_LABEL = "Try again";

export const HOME_WALLET_HREF = "/passport";

export const HOME_WALLET_LINK_BOUND = "Review wallet binding in Passport →";

export const HOME_WALLET_LINK_UNBOUND = "Bind wallet in Passport →";

export const VERIFY_ERROR_BODY =
  "The partner verify tools hit an unexpected error. Retry, open the verifier home, or use holder tools in Passport if you are checking your own records or credential JWT.";

export const VERIFY_ERROR_HOLDER_LINK_LABEL = "Open holder verify in Passport";

export const PARTNERS_REFERENCE_ONLY_NOTE =
  "Reference listing only. No public website link is available.";

export const SETUP_WALLET_READY_HEADLINE = "Wallet ready. Browse, verify, and connect";

export const SETUP_WALLET_READY_SUB =
  "Wallet bound · Account active · Add identity verification only when a partner policy requires it.";

export const PARTNER_FLOW_DOCS_PATH = "/docs/partner-flow";

export const PARTNER_RECEIPT_DOCS_ANCHOR = "/docs/partner-flow#receipt-verification";

export const INTEGRATIONS_HUB_SUBHEAD =
  "Public beta · start in sandbox immediately via Integration Studio or Partner Launchpad. Design partner applications are optional for custom policies, structured pilots, and commercial collaboration.";

export const INTEGRATIONS_APPLY_NOTE =
  "Developers can create a sandbox application and receive a one-time abx_test_* credential without waiting for approval. Production access requires reviewed activation and is never automatic.";

export const INTEGRATIONS_SDK_NOTE =
  "Example server side pattern only. Sandbox credentials come from Integration Studio or Launchpad; store abx_test_* keys server-side only.";

export const PARTNER_RECEIPT_MIRROR_NOTE =
  "The public receipt tester mirrors GET /api/receipts/{receipt_id}/public, it is not a production access gate. Your server must verify before granting access.";

export const PARTNER_POST_APPLY_HEADLINE = "After you apply as a design partner";

export const PARTNER_POST_APPLY_SUBHEAD =
  "Design partner review is optional and separate from sandbox integration. While Abraxas reviews your application (typically a few business days), you can still build in sandbox using Integration Studio.";

export const PARTNER_POST_APPLY_STEPS = [
  "Create a sandbox application in Integration Studio if you have not already.",
  "Read /docs/partner flow, entry URL params, lifecycle, and receipt checks.",
  "Implement callback handler, fetch public receipt server side; never trust URL params alone.",
  "Run npm run partner:conformance after your sandbox application is configured.",
] as const;

export const PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL = "Receipt verification (server)";

export const VERIFY_HUB_EYEBROW = "Developer tools";

export const VERIFY_HUB_HEADLINE = "Developer Receipt Tester";

export const VERIFY_HUB_SUBHEAD =
  "Validate signed Partner Flow receipts, registry records, and credential payloads during integration. This is not the customer verification experience.";

export const VERIFY_HUB_HOLDER_NOTE =
  "Holders can review their own proofs from Passport.";

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
  "self serve production",
  "automatic api-key",
  "automatic api key",
  "live integrations",
] as const;

/** Patterns that must not appear on public onboarding surfaces (sandbox requires operator/founder). */
export const LEGACY_SANDBOX_GATE_PATTERNS = [
  "sandbox credentials are operator-provisioned",
  "sandbox credentials are operator provisioned",
  "operator-provisioned after approval",
  "operator provisioned after approval",
  "operator-provisioned sandbox",
  "wait for us before you can test",
  "apply and wait for sandbox",
] as const;

export const INTEGRATOR_START_HERE_STEPS: IntegratorStartStep[] = [
  {
    step: 1,
    title: "Create a sandbox application",
    body:
      "Open Integration Studio, choose a policy, and receive a one-time abx_test_* credential. No design partner approval is required to start sandbox integration.",
    cta: { label: "Open Integration Studio", href: CANONICAL_SANDBOX_STUDIO_PATH },
    availability: "now",
  },
  {
    step: 2,
    title: "Read the Partner Flow contract",
    body:
      "Read the browser-redirect contract, frozen callback parameters, and the server side receipt verification checks your backend must implement.",
    cta: { label: "Partner Flow docs", href: PARTNER_FLOW_DOCS_PATH },
    availability: "now",
  },
  {
    step: 3,
    title: "Test in Launchpad",
    body:
      "Use Partner Launchpad to configure callbacks, run the sandbox test console, and validate signed receipts. Sandbox receipts require allowSandbox in your validator and are not production usable.",
    cta: { label: "Partner Launchpad", href: CANONICAL_SANDBOX_LAUNCHPAD_PATH },
    availability: "now",
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
  sandboxLabel: "Sandbox (self-service via Studio / Launchpad)",
  sandboxDetail:
    "Create an application and receive abx_test_* once. Receipts from sandbox policies require allowSandbox in your validator. Not valid for production gates.",
  productionLabel: "Production (review-gated)",
  productionDetail:
    `${PRODUCTION_ACCESS_NOTE} No self serve production credential issuance.`,
  receiptTesterLabel: "Partner Flow receipt tester",
  receiptTesterDetail:
    "Paste a receipt_id from your callback and mirror the server side GET /api/receipts/{receipt_id}/public check.",
  registryDemoLabel: "Registry record demo (separate)",
  registryDemoDetail:
    "Public registry showcase only, not a Partner Flow session receipt. Use the receipt tester for callback artifacts.",
} as const;

export const PARTNER_FLOW_CONFORMANCE_COMMAND = `PARTNER_FLOW_RP_PARTNER_ID=your-partner-id \\
PARTNER_FLOW_RP_POLICY_ID=your-policy-v1 \\
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \\
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\
npm run partner:conformance`;

export const PARTNER_FLOW_FIRST_TASKS = [
  `Create a sandbox application in ${CANONICAL_SANDBOX_STUDIO_PATH}.`,
  "Read /docs/partner flow, entry URL params, lifecycle, and receipt checks.",
  "Implement callback handler, fetch public receipt server side; never trust URL params alone.",
  "Run npm run partner:conformance after your sandbox application and callback URL are configured.",
] as const;
