"use client";
// FILE: components/gtm/IntegrationStudioOutcomePicker.tsx
// Outcome-first Integration Studio entry — advanced paths behind disclosure.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  FINTECH_REUSE_STUDIO_COPY,
  INTEGRATION_STUDIO_OUTCOME_LIST,
  type IntegrationStudioOutcomeId,
} from "@/lib/gtm/integrationStudioOutcomes";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

const FONT = ABRAXAS_FONT_SANS;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

export interface IntegrationStudioOutcomePickerProps {
  selectedOutcomeId: IntegrationStudioOutcomeId | null;
  onSelect: (outcome: {
    outcomeId: IntegrationStudioOutcomeId;
    pathId: IntegrationStudioPathId;
    packId: PolicyPackId;
  }) => void;
}

export function IntegrationStudioOutcomePicker({
  selectedOutcomeId,
  onSelect,
}: IntegrationStudioOutcomePickerProps) {
  const [showAdvancedHint, setShowAdvancedHint] = useState(false);
  const active = selectedOutcomeId
    ? INTEGRATION_STUDIO_OUTCOME_LIST.find((item) => item.id === selectedOutcomeId)
    : null;

  return (
    <ContentCard title="What are you trying to accomplish?">
      <p style={{ ...body, marginBottom: "0.85rem" }}>
        Choose the outcome first. Abraxas recommends one integration path — advanced options stay available below.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "0.65rem",
        }}
        role="listbox"
        aria-label="Integration outcome"
      >
        {INTEGRATION_STUDIO_OUTCOME_LIST.map((outcome) => {
          const selected = selectedOutcomeId === outcome.id;
          return (
            <button
              key={outcome.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() =>
                onSelect({
                  outcomeId: outcome.id,
                  pathId: outcome.defaultPathId,
                  packId: outcome.defaultPackId,
                })
              }
              style={{
                textAlign: "left",
                padding: "0.9rem 1rem",
                borderRadius: 14,
                border: selected
                  ? "1px solid rgba(45,212,191,0.55)"
                  : outcome.icpPriority
                    ? "1px solid rgba(232,197,71,0.35)"
                    : "1px solid var(--border)",
                background: selected
                  ? "rgba(45,212,191,0.12)"
                  : outcome.icpPriority
                    ? "rgba(232,197,71,0.06)"
                    : "var(--surface-inset)",
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              {outcome.icpPriority ? (
                <span style={{ ...body, display: "block", fontSize: "0.65rem", fontWeight: 800, color: "#E8C547", marginBottom: "0.35rem" }}>
                  Recommended for multi-app platforms
                </span>
              ) : null}
              <span style={{ display: "block", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                {outcome.title}
              </span>
              <span style={body}>{outcome.buyerSummary}</span>
            </button>
          );
        })}
      </div>

      {active?.id === "reuse_across_app" && (
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.85rem 1rem",
            borderRadius: 12,
            border: "1px solid rgba(232,197,71,0.25)",
            background: "rgba(232,197,71,0.05)",
          }}
        >
          <p style={{ ...body, fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            {FINTECH_REUSE_STUDIO_COPY.headline}
          </p>
          <p style={body}>{FINTECH_REUSE_STUDIO_COPY.body}</p>
        </div>
      )}

      <details
        style={{ marginTop: "0.85rem" }}
        onToggle={(event) => setShowAdvancedHint((event.target as HTMLDetailsElement).open)}
      >
        <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
          Advanced integration paths
        </summary>
        <p style={{ ...body, marginTop: "0.55rem" }}>
          {showAdvancedHint
            ? "All technical paths remain available in the path selector below after you choose an outcome."
            : "Open to see Solana gates, webhooks, onchain deployment kits, and other specialized paths."}
        </p>
      </details>
    </ContentCard>
  );
}
