"use client";

import { useIntegrationStudioOperational } from "@/components/developers/integrationStudioOperationalContext";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function IntegrationStudioStageGuide({ stageId }: { stageId: string }) {
  const { applicationId, signedIn, lastHttpTrace } = useIntegrationStudioOperational();

  const message = resolveStageMessage(stageId, {
    applicationId,
    signedIn,
    hasHttpTrace: Boolean(lastHttpTrace),
  });

  if (!message) return null;

  return (
    <div
      className="abx-studio-stage-guide"
      role="status"
      style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        lineHeight: 1.55,
        color: "var(--text-secondary)",
        marginBottom: "0.85rem",
        padding: "0.65rem 0.85rem",
        borderRadius: 10,
        border: "1px solid rgba(245, 245, 243, 0.1)",
        background: "rgba(0, 0, 0, 0.22)",
      }}
    >
      {message}
    </div>
  );
}

function resolveStageMessage(
  stageId: string,
  ctx: { applicationId: string | null; signedIn: boolean; hasHttpTrace: boolean },
): string | null {
  switch (stageId) {
    case "policy":
      return "Select a policy pack that matches your integration. Nothing is provisioned until you choose a pack and create or resume a sandbox application.";
    case "sandbox":
      if (ctx.applicationId) {
        return `Sandbox application ${ctx.applicationId.slice(0, 8)}… is bound to this browser. Create a verification request when you are ready.`;
      }
      return "No sandbox application yet. Use the form below to create one—your browser session attaches automatically.";
    case "configuration":
      if (!ctx.signedIn) {
        return "Launchpad session not attached. Create a sandbox above (recommended) or paste a one-time sandbox API key to configure callbacks.";
      }
      if (!ctx.applicationId) {
        return "Launchpad session is active. Create or resume a sandbox application to configure callbacks and bindings.";
      }
      return "Configure callback URLs and bindings for your sandbox application below.";
    case "request":
      if (!ctx.applicationId || !ctx.signedIn) {
        return "Requires a sandbox application and Launchpad session. Complete Sandbox and Configuration first.";
      }
      return "Issue a hosted verification request from the workbench below, then inspect the response in the inspector rail.";
    default:
      return null;
  }
}
