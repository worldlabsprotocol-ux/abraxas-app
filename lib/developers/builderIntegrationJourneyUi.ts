// FILE: lib/developers/builderIntegrationJourneyUi.ts
// Founder UX copy and stage resolution for homepage integration journey (Build 901).

import type { BuilderIntegrationPhase } from "@/lib/developers/builderExternalIntegrationAcceptance";
import type { HomeBuilderIntegrationStackId } from "@/lib/home/homeBuilderIntegrationStack";
import type { HomeBuilderPlatformId } from "@/lib/home/homeBuilderDiscovery";
import { isLocalReferenceCallbackUrl } from "@/lib/developers/integrationAdoptionPath";

export type BuilderJourneyPrimaryAction =
  | "choose_stack"
  | "get_files"
  | "check_connection"
  | "none";

export type BuilderJourneyView = {
  headline: string;
  support: string;
  primaryAction: BuilderJourneyPrimaryAction;
  primaryLabel: string;
  showExampleApp: boolean;
  stageKicker: string;
  filesPrepared: boolean;
  connectionVerified: boolean;
};

export function builderSetupSupportLine(input: {
  stack: HomeBuilderIntegrationStackId | null;
  platform: HomeBuilderPlatformId;
}): string {
  if (input.platform === "api") {
    return "Add the kit routes to your server and store the sandbox key in env.";
  }
  switch (input.stack) {
    case "nextjs":
      return "Copy the kit into your app and keep the sandbox key on the server.";
    case "wix_velo":
      return "Add the Velo backend files and set secrets in Wix.";
    case "express":
      return "Run the kit on your Node server with the sandbox key in env.";
    case "universal_https":
      return "Deploy the HTTPS handlers from the kit on your backend.";
    default:
      return "Install the kit on a server that can call Abraxas.";
  }
}

export function callbackExplanation(returnUrl: string): string {
  if (isLocalReferenceCallbackUrl(returnUrl)) {
    return "This loopback URL is for the local example server only.";
  }
  const trimmed = returnUrl.trim();
  if (trimmed.includes("/partner/callback")) {
    return "This is your allowlisted return URL on your site after holder verification. It is not Abraxas hosting your private API.";
  }
  return "Register this HTTPS URL on your application allowlist where your integration receives the return.";
}

export function resolveBuilderJourneyView(input: {
  platform: HomeBuilderPlatformId;
  platformLabel: string;
  integrationStack: HomeBuilderIntegrationStackId | null;
  filesReady: boolean;
  acceptancePhase: BuilderIntegrationPhase | null;
  setupComplete: boolean;
}): BuilderJourneyView {
  const needsStack = input.platform === "website" && !input.integrationStack;
  const connectionVerified = input.setupComplete;

  if (connectionVerified) {
    return {
      headline: "Your application is verified",
      support: "Permit and deny use real execution evidence.",
      primaryAction: "check_connection",
      primaryLabel: "Refresh status",
      showExampleApp: false,
      stageKicker: "Connection verified",
      filesPrepared: true,
      connectionVerified: true,
    };
  }

  if (needsStack) {
    return {
      headline: "Connect your website",
      support: "Pick the stack you actually use.",
      primaryAction: "choose_stack",
      primaryLabel: "Continue",
      showExampleApp: true,
      stageKicker: "Integration setup",
      filesPrepared: false,
      connectionVerified: false,
    };
  }

  if (!input.filesReady) {
    return {
      headline: `Connect your ${input.platformLabel.toLowerCase()}`,
      support: "Download files for your server. This is not a live connection yet.",
      primaryAction: "get_files",
      primaryLabel: "Get integration files",
      showExampleApp: true,
      stageKicker: "After your test",
      filesPrepared: false,
      connectionVerified: false,
    };
  }

  const phase = input.acceptancePhase;
  if (phase === "integration_files_ready" || phase === "awaiting_application_setup") {
    return {
      headline: "Add Abraxas to your site",
      support: builderSetupSupportLine({ stack: input.integrationStack, platform: input.platform }),
      primaryAction: "check_connection",
      primaryLabel: "Check the connection",
      showExampleApp: true,
      stageKicker: "Integration files ready",
      filesPrepared: true,
      connectionVerified: false,
    };
  }

  if (
    phase === "connection_established"
    || phase === "verification_received"
    || phase === "independent_verification_passed"
  ) {
    return {
      headline: "Check the connection",
      support: "Run a request from your server, then confirm enforcement here.",
      primaryAction: "check_connection",
      primaryLabel: "Check the connection",
      showExampleApp: true,
      stageKicker: "Test the connection",
      filesPrepared: true,
      connectionVerified: false,
    };
  }

  return {
    headline: "Check the connection",
    support: "Confirm your app verified and enforced the receipt.",
    primaryAction: "check_connection",
    primaryLabel: "Check the connection",
    showExampleApp: true,
    stageKicker: "Integration files ready",
    filesPrepared: true,
    connectionVerified: false,
  };
}
