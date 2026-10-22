"use client";

import {
  INTEGRATION_STUDIO_STAGE_ORDER,
  type IntegrationStudioStageId,
} from "@/lib/developers/useIntegrationStudioStage";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

function studioStageHash(stage: IntegrationStudioStageId): string {
  return stage === "policy" ? "" : stage;
}

export function IntegrationStudioStageFooter({ stage }: { stage: IntegrationStudioStageId }) {
  const index = INTEGRATION_STUDIO_STAGE_ORDER.indexOf(stage);
  const prev = index > 0 ? INTEGRATION_STUDIO_STAGE_ORDER[index - 1] : null;
  const next = index >= 0 && index < INTEGRATION_STUDIO_STAGE_ORDER.length - 1
    ? INTEGRATION_STUDIO_STAGE_ORDER[index + 1]
    : null;

  return (
    <nav
      className="abx-studio-stage-footer"
      aria-label="Stage navigation"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "0.75rem",
        marginTop: "1.25rem",
        paddingTop: "1rem",
        borderTop: "1px solid rgba(245, 245, 243, 0.1)",
        fontFamily: FONT,
        fontSize: "0.92rem",
      }}
    >
      {prev ? (
        <a
          href={prev === "policy" ? "/developers/integration-studio" : `#${prev}`}
          onClick={(event) => {
            event.preventDefault();
            window.location.hash = studioStageHash(prev);
          }}
          style={{ color: "var(--accent)", fontWeight: 700 }}
        >
          ← Back: {stageLabel(prev)}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={`#${next}`}
          onClick={(event) => {
            event.preventDefault();
            window.location.hash = next;
          }}
          style={{ color: "var(--accent)", fontWeight: 700 }}
        >
          Continue: {stageLabel(next)} →
        </a>
      ) : (
        <a href="/verify?mode=receipt" style={{ color: "var(--accent)", fontWeight: 700 }}>
          Receipt tools →
        </a>
      )}
    </nav>
  );
}

function stageLabel(stage: IntegrationStudioStageId): string {
  switch (stage) {
    case "policy":
      return "Policy";
    case "sandbox":
      return "Sandbox";
    case "configuration":
      return "Configuration";
    case "request":
      return "Request";
    default:
      return stage;
  }
}
