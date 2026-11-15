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

export const HOLDER_VERIFY_CREDENTIAL_PATH = "/passport?view=verify&mode=credential";

export const VERIFICATION_FIRST_DEFAULT_PATH = "/verify";

export const PARTNER_RECEIPT_VERIFIER_PATH = "/verify?mode=receipt";

export const NAV_PARTNER_VERIFY_LABEL = "Partner verify";

export const HOLDER_ACCOUNT_EYEBROW = "Account · public beta";

export const HOLDER_ACCOUNT_TITLE = "Your Passport status";

export const HOLDER_ACCOUNT_SUBHEAD =
  "Summary of your wallet, verification progress, and shortcuts to Passport tools.";

export const HOLDER_ACCOUNT_SIGNED_OUT_TITLE = "Your Abraxas account";

export const HOLDER_ACCOUNT_SIGNED_OUT_SUBHEAD =
  "Connect a Sui wallet for blockchain access, or open your Passport account for identity and verification tools.";

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
  "Public beta · design partner applications reviewed manually. Submit integration intent below, sandbox policies and callback allowlists are operator provisioned after approval, not self serve.";

export const INTEGRATIONS_APPLY_NOTE =
  "Apply once at this form. Abraxas operators review applications manually. There is no self serve production portal or automatic API-key issuance.";

export const INTEGRATIONS_SDK_NOTE =
  "Example server side pattern only. API credentials are operator provisioned after manual approval, not self serve.";

export const PARTNER_RECEIPT_MIRROR_NOTE =
  "The public receipt tester mirrors GET /api/receipts/{receipt_id}/public, it is not a production access gate. Your server must verify before granting access.";

export const PARTNER_POST_APPLY_HEADLINE = "After you apply";

export const PARTNER_POST_APPLY_SUBHEAD =
  "While Abraxas operators review your application (typically a few business days), start with the Partner Flow contract and server side receipt checks.";

export const PARTNER_POST_APPLY_STEPS = [
  "Read /docs/partner flow, entry URL, callback params, and lifecycle.",
  "Implement server side receipt verification, GET /api/receipts/{receipt_id}/public before granting access (/docs/partner flow#receipt-verification).",
  "When operators provision sandbox partner_id, policy_id, and allowlisted return_url, test with the receipt tester (public mirror only).",
  "Run npm run partner:conformance after sandbox credentials are issued.",
] as const;

export const PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL = "Receipt verification (server)";

export const INDEPENDENT_VERIFY_ENTRY_COPY = {
  title: "Verify a receipt independently",
  subline:
    "Try the teaching demo or paste your own bundle. No account needed. Production verification runs offline with your own pinned trust material.",
  useDemoLabel: "Use demo receipt",
  pasteLabel: "Paste my receipt",
  footerNote: "Need server mirrors, registry lookup, or JWT demos?",
} as const;

/** Paste step — plain language, no secrets in the shape example. */
export const INDEPENDENT_VERIFY_PASTE_COPY = {
  lead:
    "Paste one complete portable verification bundle (a JSON file). This field is not for shell commands, environment variables, or receipt IDs alone.",
  placeholder: '{ "schema": "abraxas_portable_verification_bundle/1.0.0", … }',
  checkLabel: "Check this bundle",
  loadSampleLabel: "Load teaching sample",
  useDemoInsteadLabel: "Use demo receipt instead",
  exampleCaption: "Expected shape (keys only — real bundles include signed payloads):",
  exampleJson: `{
  "schema": "abraxas_portable_verification_bundle/1.0.0",
  "decision_receipt": { "receipt_id": "…", "partner_id": "…", "policy_id": "…" },
  "bundled_trust_anchor": { "anchor_key_id": "…", "public_jwk": { … } },
  "signed_status_statement": { … },
  "signed_issuer_authority": { … }
}`,
  errors: {
    notJson:
      "This doesn't look like a receipt bundle. Paste the complete JSON file—not commands, env vars, or a single line of text.",
    incompleteBundle:
      "This doesn't look like a complete portable bundle. Include schema, decision_receipt, trust anchor, and signed status evidence.",
    missingTrust: "The bundle is missing trust anchor material.",
    verifyFailed: "We could not verify that bundle. Fix the JSON and try again without leaving this screen.",
    sampleLoadFailed: "Teaching sample could not load. Use the demo receipt or try again shortly.",
  },
  errorTitle: "Invalid bundle paste",
  sampleLoadedHint: "Teaching sample loaded (synthetic, not production). Review it, then run Check this bundle.",
} as const;

/** Post-verify integration path — no Abraxas account required for steps 1–3. */
export const VERIFICATION_FIRST_PARTNER_PATH = {
  syntheticBundleHref: "/api/developers/verification-first/synthetic-bundle",
  offlineWorkspaceHref: "/developers/institutional-verification",
  quickstartHref: "/docs/VERIFY_WITH_ABRAXAS_QUICKSTART",
  applyHref: PARTNER_APPLICATION_PATH,
  npmPackage: "@abraxas/independent-verifier",
  fixtureDir: "examples/integration-first-relying-party/fixtures",
} as const;

export const VERIFICATION_FIRST_OFFLINE_CTA = {
  headline: "Next: verify offline in your environment",
  summary: "After you understand the hosted result, take the teaching bundle and verifier into your own runtime.",
  body:
    "@abraxas/independent-verifier is not on public npm. Use the tarball path documented below, pin a trust anchor out-of-band (never rely on the anchor inside a pasted bundle alone), then verify without Abraxas login or hosted APIs.",
  downloadLabel: "Download labeled synthetic teaching bundle",
  workspaceLabel: "Verifier install steps",
  applyLabel: "Apply for authorized production integration",
  teachingDisclaimer:
    "The downloadable bundle uses synthetic sandbox fixtures only. A passing teaching check proves verification mechanics, not real institutional authority or production approval.",
} as const;

/** Working distribution paths without public npm (founder-approved tarball only). */
export const VERIFICATION_FIRST_VERIFIER_INSTALL = {
  registryStatus: "not_on_public_npm" as const,
  withRepoAccess: [
    "git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git",
    "cd abraxas-app && npm ci",
    "npm run build831:pack-verifier",
    "cd artifacts/npm && shasum -a 256 -c abraxas-independent-verifier-0.1.1.tgz.sha256",
    "npm install ./abraxas-independent-verifier-0.1.1.tgz   # from your separate app directory",
    "npm run test:integration-first-821",
  ],
  designPartner:
    "Design partners may receive the same .tgz plus SHA256 from operators without cloning the full monorepo.",
  trustPin:
    "Pin trust-anchor-bundle.json through your own channel. Treat bundled_trust_anchor in exports as informational until it matches your pin.",
} as const;

export const VERIFY_DEVELOPER_EYEBROW = "Developer testing";

export const VERIFY_DEVELOPER_HEADLINE = "Integration and mirror testers";

export const VERIFY_DEVELOPER_SUBHEAD =
  "These tools are for engineers wiring Partner Flow — not the default independent check. Start on the plain verify page unless you know you need a specific tester.";

export const VERIFY_HUB_EYEBROW = VERIFY_DEVELOPER_EYEBROW;

export const VERIFY_HUB_HEADLINE = VERIFY_DEVELOPER_HEADLINE;

export const VERIFY_HUB_SUBHEAD = VERIFY_DEVELOPER_SUBHEAD;

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

export const INTEGRATOR_START_HERE_STEPS: IntegratorStartStep[] = [
  {
    step: 1,
    title: "Apply for manual review",
    body:
      "Submit a design partner application for age gated digital commerce. Abraxas operators review applications manually, there is no self serve production portal and no automatic API-key issuance.",
    cta: { label: "Apply for review", href: PARTNER_APPLICATION_PATH },
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
    title: "Use sandbox when provisioned",
    body:
      "After approval, operators may provision sandbox policies and callback allowlists. Test with the receipt tester using operator provided receipt IDs. Sandbox receipts are not production usable unless your validator explicitly opts in with allowSandbox.",
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
  sandboxLabel: "Sandbox (operator provisioned test policies)",
  sandboxDetail:
    "May be issued after manual approval. Receipts from sandbox policies require allowSandbox in your validator. Not valid for production gates.",
  productionLabel: "Production (operator-provisioned)",
  productionDetail:
    "Requires approved partner row, active policy, allowlisted callback URLs, and production_usable receipts. No self serve provisioning.",
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
  `Apply at ${PARTNER_APPLICATION_PATH}, describe your age gated checkout or eligibility gate.`,
  "Read /docs/partner flow, entry URL params, lifecycle, and receipt checks.",
  "Implement callback handler, fetch public receipt server side; never trust URL params alone.",
  "Run npm run partner:conformance after operators provision partner_id, policy_id, and return_url.",
] as const;
