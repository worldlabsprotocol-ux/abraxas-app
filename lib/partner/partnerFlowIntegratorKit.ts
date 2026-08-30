// FILE: lib/partner/partnerFlowIntegratorKit.ts
// Partner Flow integrator kit — shared docs content and canonical production contract.

import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";
import { SITE_URL } from "@/lib/siteUrl";

export const PARTNER_FLOW_CANONICAL_HOST = SITE_URL;

export const PARTNER_FLOW_HEADLINE = "Partner Flow — browser redirect integration";

export const PARTNER_FLOW_SUMMARY =
  "Redirect holders to Abraxas, receive a signed session receipt on your callback URL, and verify it server-side via the public receipt endpoint. No API key in the browser.";

export const INTEGRATION_PATH_DECISION_TREE = [
  {
    path: "Partner Flow (this guide)",
    when: "Web or mobile app with a browser redirect; age-gated retail, booking, or policy-based eligibility",
    auth: "Browser session cookie on abraxasworld.xyz only — no partner API key in client code",
    start: `${SITE_URL}/partner/verify?partner_id=…&policy_id=…&return_url=…`,
    verify: "GET /api/receipts/{receipt_id}/public (no auth)",
  },
  {
    path: "Server verification requests",
    when: "Your backend starts the flow and polls for a decision after holder consent",
    auth: "Partner API key (verify:requests) server-side only",
    start: "POST /api/v1/verification-requests → redirect holder to consent_url",
    verify: "GET /api/v1/decisions/{id}/status",
    docs: "/docs/partner-verification-requests",
  },
  {
    path: "Credential / registry verify",
    when: "Gate on an existing credential JWT, wallet policy check, or registry record",
    auth: "API key when required; public for credential_jwt mode",
    start: "POST /api/credentials/verify",
    verify: "GET /api/proof/{proof_id} or signature on response",
    docs: "/docs/relying-party-verify",
  },
  {
    path: "Abraxas Connect",
    when: "EVM wallet binding + consent-gated authorization loop",
    auth: "Partner API key server-side; browser session on Connect UI",
    start: "POST /api/v1/authorize → hosted_connect_url",
    verify: "GET /api/v1/authorize/{id}/status",
    docs: "/docs/ail",
  },
] as const;

export const PARTNER_FLOW_ENTRY_PARAMS = [
  { name: "partner_id", required: true, description: "Relying party identifier (must exist in partners table)" },
  { name: "policy_id", required: true, description: "Active partner_policies.id to evaluate (or use permission + permission_version instead)" },
  { name: "return_url", required: true, description: "HTTPS callback on your origin; must be allowlisted in partners.allowed_return_urls" },
  { name: "permission", required: false, description: "Alternative to policy_id — resolved to a policy for the relying party" },
  { name: "permission_version", required: false, description: "Optional permission version pin" },
] as const;

export const PARTNER_FLOW_LIFECYCLE = [
  {
    step: 1,
    title: "Redirect to Partner Flow entry",
    body: `Send the holder to ${SITE_URL}/partner/verify with partner_id, policy_id, and return_url query parameters.`,
  },
  {
    step: 2,
    title: "Holder authenticates",
    body: "zkLogin or wallet sign-in sets an httpOnly abraxas_browser_session cookie on the Abraxas origin. Your site never sees this cookie.",
  },
  {
    step: 3,
    title: "POST /api/v1/partner-flow/evaluate",
    body: "Abraxas UI calls evaluate with the browser session. next=enter (returning user), passport (ID required), pending_review, denied, or authenticate.",
  },
  {
    step: 4,
    title: "Passport + consent (first visit)",
    body: "When next=passport, holder completes ID/biometric capture and consent. After admin approval, POST /api/v1/partner-flow/complete issues the session receipt.",
  },
  {
    step: 5,
    title: "Callback redirect",
    body: "Holder returns to return_url with frozen query parameters (no PII). Your server validates the receipt before granting access.",
  },
  {
    step: 6,
    title: "Refresh (optional)",
    body: "When the session receipt TTL expires but the credential remains valid, POST /api/v1/partner-flow/refresh re-issues a receipt (browser session required).",
  },
] as const;

export const PARTNER_FLOW_CALLBACK_PARAMS = PARTNER_CALLBACK_PARAMS;

export const PARTNER_FLOW_CALLBACK_PII_NOTE =
  "Callback query parameters contain no PII — no legal name, DOB, document numbers, images, or wallet address. Verify eligibility via the signed receipt, not the URL alone.";

export const PARTNER_FLOW_RECEIPT_CHECKS = [
  { check: "signature_valid === true", why: "Ed25519 signature over canonical payload_hash" },
  { check: "decision_result === \"approved\"", why: "Fail closed on denied or manual_review" },
  { check: "status === \"active\"", why: "Reject expired, revoked, or unknown receipt state" },
  { check: "expires_at present, valid, and not passed", why: "Session receipt TTL; re-verify at settlement time" },
  { check: "production_usable === true", why: "Required for production gates; sandbox policies need explicit allowSandbox opt-in in your validator" },
  { check: "partner_id matches your integration", why: "Prevents cross-partner receipt replay" },
  { check: "policy_id matches your gate", why: "Ensures the evaluated policy is the one you requested" },
] as const;

export const PARTNER_FLOW_ERROR_TABLE = [
  { condition: "No browser session on evaluate/complete/refresh", http: "401", action: "Holder must sign in on abraxasworld.xyz first" },
  { condition: "return_url not in partners.allowed_return_urls", http: "400", action: "Ask Abraxas ops to allowlist your exact callback URL" },
  { condition: "Missing partner_id or return_url", http: "400", action: "Fix redirect URL construction" },
  { condition: "Policy does not belong to partner", http: "400", action: "Align policy_id with partner_id" },
  { condition: "next=denied", http: "200", action: "Show denial UX; do not grant access" },
  { condition: "next=pending_review", http: "200", action: "Manual review in progress; poll or ask holder to return later" },
  { condition: "Receipt not found (public)", http: "404", action: "Fail closed; check receipt_id from callback" },
  { condition: "signature_valid === false", http: "200", action: "Fail closed; do not trust callback params without valid receipt" },
  { condition: "Audit persistence failed", http: "503", action: "Retry evaluate; contact Abraxas ops if persistent" },
] as const;

export const PARTNER_FLOW_AUTH_BOUNDARY = {
  browserSession: [
    "POST /api/v1/partner-flow/evaluate",
    "POST /api/v1/partner-flow/complete",
    "POST /api/v1/partner-flow/refresh",
    "/partner/verify UI",
    "/passport consent and capture",
  ],
  serverApiKey: [
    "POST /api/v1/verify/authorize",
    "GET /api/v1/verify/decisions/{id}",
    "POST /api/v1/verification-requests",
    "GET /api/v1/receipts/{id} (authenticated partner view)",
    "POST /api/credentials/verify",
  ],
  publicNoAuth: [
    "GET /api/receipts/{receipt_id}/public",
    "GET /api/credentials/public-key",
  ],
} as const;

export function buildPartnerFlowEntryUrl(input: {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  origin?: string;
}): string {
  const base = (input.origin ?? PARTNER_FLOW_CANONICAL_HOST).replace(/\/$/, "");
  const params = new URLSearchParams({
    partner_id: input.partnerId,
    policy_id: input.policyId,
    return_url: input.returnUrl,
  });
  return `${base}/partner/verify?${params.toString()}`;
}

export const PARTNER_FLOW_REDIRECT_EXAMPLE = `// Server-render or link — never embed API keys in the browser
const verifyUrl = ${JSON.stringify(
  buildPartnerFlowEntryUrl({
    partnerId: "your-partner-id",
    policyId: "your-policy-v1",
    returnUrl: "https://your-app.example.com/auth/abraxas/callback",
  }),
)};

// <a href={verifyUrl}>Continue with Abraxas</a>`;

export const PARTNER_FLOW_CALLBACK_VERIFY_EXAMPLE = `// Server-side only — after holder lands on your callback URL
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const receiptId = searchParams.get("receipt_id");
const res = await fetch(
  \`${SITE_URL}/api/receipts/\${receiptId}/public\`
);
const receipt = await res.json();

const result = validatePartnerFlowPublicReceipt(receipt, {
  partnerId: "your-partner-id",
  policyId: "your-policy-v1",
  // allowSandbox: true, // only for explicit sandbox/pilot policy testing
});

if (!result.ok) {
  throw new Error(result.errors.join("; "));
}

// Grant gated action — receipt cryptographically verified`;

export const PARTNER_WEBHOOK_SANDBOX_EVENT_TYPE = "partner.webhook.test" as const;

export const PARTNER_WEBHOOK_LIFECYCLE_EVENT_TYPES = [
  "partner.receipt.issued",
  "partner.receipt.revoked",
  "partner.access.revoked",
  "partner.credential.revoked",
] as const;

export const PARTNER_WEBHOOK_SANDBOX_GUIDE = {
  headline: "Webhook sandbox test delivery",
  summary:
    "Queue a single partner.webhook.test event from the partner portal with an abx_test_ key. Queued does not mean delivered — confirm in your handler and delivery history.",
  queuedDisclaimer:
    "A successful enqueue returns queued: true. Delivery is asynchronous; inspect delivery history for delivered, retrying, or failed outcomes.",
  portalPath: "/developers/partner",
  docsAnchor: "webhook-sandbox",
  endpoints: {
    status: "/api/partner/webhooks/status",
    delivery_history: "/api/v1/partner/webhooks/deliveries",
    sandbox_test_enqueue: "/api/partner/webhooks/test-delivery",
  },
} as const;

export const PARTNER_WEBHOOK_SANDBOX_VS_LIFECYCLE_NOTE =
  "Sandbox test events (partner.webhook.test with test: true) are for signature and handler verification only. They are not Partner Flow lifecycle notifications such as partner.receipt.issued.";

export {
  PARTNER_ONBOARDING_HEADLINE,
  PARTNER_ONBOARDING_SUPPORTING_COPY,
  PARTNER_ONBOARDING_FUTURE_EXPLAINER,
  PARTNER_ONBOARDING_FUTURE_LABEL,
  PARTNER_ONBOARDING_AVAILABLE_NOW,
  PARTNER_ONBOARDING_IN_DEVELOPMENT,
  PARTNER_ONBOARDING_PRIVACY_PRINCIPLES,
  PARTNER_ONBOARDING_HOW_IT_WORKS,
  PARTNER_CONSENT_MOCKUP_CONTROLS,
  PARTNER_CONSENT_MOCKUP_NOTE,
} from "@/lib/partner/partnerOnboardingPositioning";
