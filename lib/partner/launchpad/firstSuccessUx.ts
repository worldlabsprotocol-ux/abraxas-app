// FILE: lib/partner/launchpad/firstSuccessUx.ts
// First-success presentation derived from canonical journey + integration evidence.

import { callbackConfigured, type LaunchpadJourneyResolution } from "@/lib/partner/launchpad/journeyState";

export interface LaunchpadIntegrationEvidence {
  verified_receipt_count: number;
  starter_kit_evidenced: boolean;
  active_sandbox_key: boolean;
  hosted_handoff_completed_count?: number;
  receipt_verification_succeeded_count?: number;
}

export interface LaunchpadFirstSuccessPresentation {
  primaryLabel: string;
  primaryDetail: string;
  primaryCta: string;
  whyItMatters: string | null;
  stage: LaunchpadJourneyResolution["currentStage"];
  humanStatus: string;
  showCallbackEducation: boolean;
  showServerVerificationSuccess: boolean;
  showReuseDiscovery: boolean;
  showProductionTransition: boolean;
  environmentNotice: string;
}

const INTEGRATION_EVENT_LABELS: Record<string, string> = {
  verification_request_created: "Verification request created",
  holder_flow_completed: "Holder verification completed",
  hosted_handoff_completed: "Holder returned to your callback URL",
  receipt_verification_succeeded: "Result verified on your server",
  evidence_reuse_accepted: "Evidence reuse accepted",
  partner_verification_succeeded: "Partner verification succeeded",
  receipt_issued: "Signed result issued",
  receipt_verified: "Result verified",
};

export function humanIntegrationEventLabel(eventType: string): string {
  if (INTEGRATION_EVENT_LABELS[eventType]) return INTEGRATION_EVENT_LABELS[eventType];
  return eventType.replace(/_/g, " ");
}

export function deriveLaunchpadFirstSuccess(input: {
  journey: LaunchpadJourneyResolution;
  evidence: LaunchpadIntegrationEvidence;
  callbackUrls: string[];
  productionActivated: boolean;
}): LaunchpadFirstSuccessPresentation {
  const { journey, evidence, callbackUrls, productionActivated } = input;
  const callbacksReady = callbackConfigured(callbackUrls);
  const serverVerified = evidence.verified_receipt_count > 0
    || (evidence.receipt_verification_succeeded_count ?? 0) > 0;
  const holderReturned = (evidence.hosted_handoff_completed_count ?? 0) > 0;
  const base = journey.primaryAction;

  const environmentNotice = productionActivated
    ? "Production — live credentials require reviewed activation. Sandbox success alone does not authorize production traffic."
    : "Sandbox — safe for integration and testing. Results here are not production authorization.";

  if (serverVerified && journey.testPassed) {
    const productionReview = journey.state === "production_review_required";
    return {
      primaryLabel: productionReview
        ? "Production review in progress"
        : "Sandbox integration working",
      primaryDetail: productionReview
        ? "Abraxas is reviewing your production access request. Activation remains a reviewer decision."
        : "Your server verified a sandbox result. Review production requirements when you are ready to go live.",
      primaryCta: productionReview ? "View go-live status" : "Prepare production review",
      whyItMatters: null,
      stage: journey.currentStage,
      humanStatus: "Result verified",
      showCallbackEducation: false,
      showServerVerificationSuccess: true,
      showReuseDiscovery: true,
      showProductionTransition: !productionActivated,
      environmentNotice,
    };
  }

  if (holderReturned && !serverVerified) {
    return {
      primaryLabel: "Verify the result on your server",
      primaryDetail: "The holder finished verification and your callback URL received a continuation signal. Verify the signed result before granting access.",
      primaryCta: "Open integration quickstart",
      whyItMatters: "Callbacks tell you something happened. Your server verifies whether the result is authentic and currently valid.",
      stage: journey.currentStage,
      humanStatus: "Verification complete — server check required",
      showCallbackEducation: true,
      showServerVerificationSuccess: false,
      showReuseDiscovery: false,
      showProductionTransition: false,
      environmentNotice,
    };
  }

  if (callbacksReady && evidence.starter_kit_evidenced && !serverVerified) {
    return {
      primaryLabel: "Run your first end-to-end verification",
      primaryDetail: "Send a holder through verification, receive the callback signal, then verify the signed result on your server.",
      primaryCta: base.cta,
      whyItMatters: "A successful server verification proves your integration is wired correctly before production review.",
      stage: journey.currentStage,
      humanStatus: "Ready for first verification",
      showCallbackEducation: true,
      showServerVerificationSuccess: false,
      showReuseDiscovery: false,
      showProductionTransition: false,
      environmentNotice,
    };
  }

  if (callbacksReady && !evidence.starter_kit_evidenced) {
    return {
      primaryLabel: base.label,
      primaryDetail: base.detail,
      primaryCta: base.cta,
      whyItMatters: "Integration files connect your website to Abraxas so holders can verify and your server can receive a callback signal.",
      stage: journey.currentStage,
      humanStatus: "Callback configured",
      showCallbackEducation: true,
      showServerVerificationSuccess: false,
      showReuseDiscovery: false,
      showProductionTransition: false,
      environmentNotice,
    };
  }

  if (!callbacksReady && evidence.active_sandbox_key) {
    return {
      primaryLabel: "Configure your callback URL",
      primaryDetail: "Tell Abraxas where to send holders after verification. The callback is a continuation signal — not authorization.",
      primaryCta: "Configure callback",
      whyItMatters: "Your server must verify every result. The callback only tells you when to check.",
      stage: "test_app",
      humanStatus: "Sandbox ready",
      showCallbackEducation: true,
      showServerVerificationSuccess: false,
      showReuseDiscovery: false,
      showProductionTransition: false,
      environmentNotice,
    };
  }

  return {
    primaryLabel: base.label,
    primaryDetail: base.detail,
    primaryCta: base.cta,
    whyItMatters: journey.currentStage === "connect" || journey.currentStage === "test"
      ? "Callbacks tell you something happened. Your server verifies whether the result is authentic and currently valid."
      : null,
    stage: journey.currentStage,
    humanStatus: journey.statusLine,
    showCallbackEducation: journey.currentStage === "connect" || journey.currentStage === "test",
    showServerVerificationSuccess: false,
    showReuseDiscovery: false,
    showProductionTransition: false,
    environmentNotice,
  };
}
