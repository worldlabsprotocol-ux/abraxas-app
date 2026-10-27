// FILE: lib/developers/integrationAdoptionPath.ts
// Shortest supported path: sandbox app → external relying party → independent enforcement (Build 873).

import { hostedHandoffHttpExamples } from "@/lib/partner/hostedHandoff/examples";

export const EXTERNAL_NODE_PARTNER_REFERENCE = {
  repoPath: "examples/external-node-partner",
  docsPath: "examples/external-node-partner/README.md",
  httpContractPath: "examples/external-node-partner/HTTP_API.md",
  defaultCallbackBase: "http://127.0.0.1:3847",
  defaultCallbackPath: "/callback",
} as const;

/** Local reference server only — never a production or hosted-app default. */
export const LOCAL_REFERENCE_CALLBACK_URL = `${EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase}${EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackPath}` as const;

export function isLocalReferenceCallbackUrl(url: string | null | undefined): boolean {
  const normalized = (url ?? "").trim().toLowerCase();
  return (
    normalized.startsWith("http://127.0.0.1:3847")
    || normalized.startsWith("http://localhost:3847")
  );
}

export type IntegrationAdoptionFocus = {
  step: IntegrationAdoptionStep;
  stepIndex: number;
  totalSteps: number;
  primaryLabel: string;
  primaryKind: "configure_callback" | "copy_credentials" | "run_handoff" | "verify_independently" | "production_review";
  detail: string;
};

/** One relevant Studio action — full ladder remains in engineering contract / details. */
export function resolveIntegrationAdoptionFocus(input: {
  hasSandboxApplication: boolean;
  callbackUrl: string | null;
  apiKeyRevealedOnce: boolean;
  completedPartnerHandoff: boolean;
  completedIndependentVerify: boolean;
}): IntegrationAdoptionFocus {
  const totalSteps = INTEGRATION_ADOPTION_STEPS.length;
  const stepById = (id: IntegrationAdoptionStepId) =>
    INTEGRATION_ADOPTION_STEPS.find((s) => s.id === id)!;

  if (!input.hasSandboxApplication) {
    const step = stepById("configure_application");
    return {
      step,
      stepIndex: 1,
      totalSteps,
      primaryLabel: "Create sandbox application",
      primaryKind: "configure_callback",
      detail: step.integratorAction,
    };
  }

  const callback = input.callbackUrl?.trim() ?? "";
  if (!callback) {
    const step = stepById("callback_return");
    return {
      step,
      stepIndex: step.order,
      totalSteps,
      primaryLabel: "Set your application callback URL",
      primaryKind: "configure_callback",
      detail: "Use your server’s HTTPS return URL. For the copy-ready local reference only, choose “Use local reference server”.",
    };
  }

  if (!input.apiKeyRevealedOnce) {
    const step = stepById("server_credentials");
    return {
      step,
      stepIndex: step.order,
      totalSteps,
      primaryLabel: "Copy sandbox API key to your server",
      primaryKind: "copy_credentials",
      detail: step.integratorAction,
    };
  }

  if (!input.completedPartnerHandoff) {
    const step = stepById("verification_request");
    return {
      step,
      stepIndex: step.order,
      totalSteps,
      primaryLabel: "Run verification request from your backend",
      primaryKind: "run_handoff",
      detail: step.integratorAction,
    };
  }

  if (!input.completedIndependentVerify) {
    const step = stepById("independent_verify");
    return {
      step,
      stepIndex: step.order,
      totalSteps,
      primaryLabel: "Verify the signed receipt independently",
      primaryKind: "verify_independently",
      detail: step.integratorAction,
    };
  }

  const step = stepById("production_gate");
  return {
    step,
    stepIndex: step.order,
    totalSteps,
    primaryLabel: "Review production authorization requirements",
    primaryKind: "production_review",
    detail: step.integratorAction,
  };
}

export type IntegrationAdoptionStepId =
  | "configure_application"
  | "server_credentials"
  | "policy_binding"
  | "verification_request"
  | "holder_when_required"
  | "callback_return"
  | "signed_receipt"
  | "independent_verify"
  | "application_enforcement"
  | "production_gate";

export type IntegrationAdoptionStep = {
  id: IntegrationAdoptionStepId;
  order: number;
  title: string;
  integratorAction: string;
  abraxasSurface: string;
  referenceHint: string;
};

/** Ordered adoption ladder — maps to existing contracts, not a new protocol. */
export const INTEGRATION_ADOPTION_STEPS: readonly IntegrationAdoptionStep[] = [
  {
    id: "configure_application",
    order: 1,
    title: "Configure sandbox application",
    integratorAction: "Create or resume a sandbox app with an allowlisted callback URL.",
    abraxasSurface: "Integration Studio → Create my test app · Launchpad applications API",
    referenceHint: "Set callback to external-node-partner `/callback` for local reference runs.",
  },
  {
    id: "server_credentials",
    order: 2,
    title: "Store API credentials server-side",
    integratorAction: "Copy the one-time sandbox API key into server env only (never the browser).",
    abraxasSurface: "Launchpad provision response · `abx_test_…` prefix shown in Studio",
    referenceHint: "examples/external-node-partner/.env.example",
  },
  {
    id: "policy_binding",
    order: 3,
    title: "Bind verification policy",
    integratorAction: "Use the provisioned policy_id and partner_id on every handoff and verify call.",
    abraxasSurface: "Application policy pin · Partner Flow policy version",
    referenceHint: "Mismatch → deny/indeterminate at independent verify.",
  },
  {
    id: "verification_request",
    order: 4,
    title: "Request verification from your backend",
    integratorAction: "POST /api/v1/partner-handoff with application id + sandbox API key.",
    abraxasSurface: "Hosted handoff API · Integration Studio request workbench",
    referenceHint: hostedHandoffHttpExamples().universal_https.split("\n")[0],
  },
  {
    id: "holder_when_required",
    order: 5,
    title: "Holder authorization (when required)",
    integratorAction: "Open hosted_url; holder completes wallet consent in Abraxas UI.",
    abraxasSurface: "Hosted partner / verify flow",
    referenceHint: "Skip when testing server-only configuration — wallet step still required for wallet_control.",
  },
  {
    id: "callback_return",
    order: 6,
    title: "Receive callback or return signal",
    integratorAction: "Handle allowlisted HTTPS return; treat query as a pointer, not proof.",
    abraxasSurface: "Configured allowed_return_urls on application",
    referenceHint: `${EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase}${EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackPath}`,
  },
  {
    id: "signed_receipt",
    order: 7,
    title: "Retrieve signed receipt material",
    integratorAction: "Fetch portable verification bundle or public receipt export server-side.",
    abraxasSurface: "GET portable-verification / partner-handoff ref resolution",
    referenceHint: "external-node-partner fetchPortableVerificationBundle",
  },
  {
    id: "independent_verify",
    order: 8,
    title: "Verify independently",
    integratorAction: "Run @abraxas/independent-verifier with pinned trust anchor (out-of-band).",
    abraxasSurface: "No Abraxas UI required at verify time",
    referenceHint: "examples/portable-relying-party · examples/integration-first-relying-party",
  },
  {
    id: "application_enforcement",
    order: 9,
    title: "Enforce permit · deny · indeterminate",
    integratorAction: "Map enforcement action to your protocol gate; indeterminate never authorizes.",
    abraxasSurface: "enforceIndependent / enforcementFromIndependentVerification (Build 870 freshness)",
    referenceHint: "examples/external-node-partner/src/enforce.ts",
  },
  {
    id: "production_gate",
    order: 10,
    title: "Production authorization",
    integratorAction: "Complete Launchpad production review; rotate keys; publish production trust anchor.",
    abraxasSurface: "Partner activation · production upgrade CTA",
    referenceHint: "docs/LAUNCHPAD_DEPLOYMENT.md",
  },
] as const;

export type IntegrationAdoptionGapId =
  | "missing_sandbox_app"
  | "callback_not_allowlisted"
  | "api_key_not_copied"
  | "trust_anchor_not_pinned"
  | "confuses_wallet_demo_with_partner_integration";

export type IntegrationAdoptionGap = {
  id: IntegrationAdoptionGapId;
  severity: "blocker" | "warning";
  message: string;
  remediation: string;
};

export function detectIntegrationAdoptionGaps(input: {
  hasSandboxApplication: boolean;
  callbackUrl: string | null;
  apiKeyRevealedOnce: boolean;
  completedFirstPartyWalletDemo: boolean;
  completedPartnerHandoff: boolean;
}): IntegrationAdoptionGap[] {
  const gaps: IntegrationAdoptionGap[] = [];
  if (!input.hasSandboxApplication) {
    gaps.push({
      id: "missing_sandbox_app",
      severity: "blocker",
      message: "No sandbox application is provisioned for this session.",
      remediation: "Create my test app in Integration Studio or resume an existing sandbox application.",
    });
  }
  const callback = input.callbackUrl?.trim() ?? "";
  if (input.hasSandboxApplication && !callback) {
    gaps.push({
      id: "callback_not_allowlisted",
      severity: "blocker",
      message: "Callback URL is empty — Abraxas cannot return control to your application.",
      remediation: `Set an HTTPS or localhost callback (reference: ${EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase}${EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackPath}).`,
    });
  }
  if (input.hasSandboxApplication && !input.apiKeyRevealedOnce) {
    gaps.push({
      id: "api_key_not_copied",
      severity: "warning",
      message: "Sandbox API key has not been copied in this browser session.",
      remediation: "Copy the one-time key at provision time; Studio cannot show it again.",
    });
  }
  if (input.completedFirstPartyWalletDemo && !input.completedPartnerHandoff) {
    gaps.push({
      id: "confuses_wallet_demo_with_partner_integration",
      severity: "warning",
      message: "Developer Workspace wallet proof does not configure your application's partner integration.",
      remediation: "Provision a sandbox app and run POST /api/v1/partner-handoff from your server.",
    });
  }
  gaps.push({
    id: "trust_anchor_not_pinned",
    severity: "warning",
    message: "Independent verification requires an out-of-band pinned trust anchor.",
    remediation: "Copy trust-config demo template to your server; rotate via operator runbook for production.",
  });
  return gaps;
}

export function buildExternalNodePartnerEnvTemplate(input: {
  baseUrl: string;
  applicationId: string;
  partnerId: string;
  policyId: string;
  bindingId?: string | null;
  callbackBaseUrl?: string;
}): string {
  const callbackBase = input.callbackBaseUrl ?? EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase;
  return `# Generated by Integration Studio (Build 873) — paste into examples/external-node-partner/.env
# Never commit real ABRAXAS_API_KEY values.
ABRAXAS_BASE_URL=${input.baseUrl}
ABRAXAS_API_KEY=<paste one-time sandbox key from Studio>
ABRAXAS_APPLICATION_ID=${input.applicationId}
ABRAXAS_BINDING_ID=${input.bindingId ?? "<optional binding id from Launchpad>"}
ABRAXAS_PARTNER_ID=${input.partnerId}
ABRAXAS_POLICY_ID=${input.policyId}
ABRAXAS_TRUST_ANCHOR_PATH=./trust-anchor.demo.json
ABRAXAS_VERIFY_ENVIRONMENT=demo
PORT=3847
CALLBACK_BASE_URL=${callbackBase}
`;
}

export function integrationAdoptionManualStepCount(): number {
  return INTEGRATION_ADOPTION_STEPS.length;
}
