"use client";
// FILE: components/partner/launchpad/InstitutionalLaunchpadOperationsPanel.tsx

import { PartnerLifecycleControlRoomVisual } from "@/components/protocol-visuals";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { LaunchpadActivityEvidenceTable } from "@/components/partner/launchpad/LaunchpadActivityEvidenceTable";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { InstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import { summarizeOperationalMapping } from "@/lib/partner/launchpad/institutionalLaunchpadStepMapping";

const FONT = ABRAXAS_FONT_SANS;

export function InstitutionalLaunchpadOperationsPanel(input: {
  activation: InstitutionalActivationEvidence | null;
  activity: Array<{ id: string; event_type: string; public_code: string | null; created_at: string }>;
}) {
  const mapping = summarizeOperationalMapping(input.activation);

  return (
    <details>
      <summary style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", color: "var(--text-primary)" }}>
        Partner operations
      </summary>
      <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.85rem" }}>
        <div className="abx-surface-protocol-visual abx-surface-protocol-visual--compact">
          <PartnerLifecycleControlRoomVisual />
        </div>
        {mapping.length > 0 && (
          <ContentCard title="Operational milestones">
            <ol style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {mapping.map((row) => (
                <li key={row.milestone_id}>
                  {row.milestone_label}
                  {row.task_step_id ? ` → ${row.task_step_id.replace(/_/g, " ")}` : ""}
                  {" · "}
                  {row.status}
                </li>
              ))}
            </ol>
          </ContentCard>
        )}
        {input.activity.length > 0 && (
          <ContentCard title="Integration timeline">
            <LaunchpadActivityEvidenceTable events={input.activity} />
          </ContentCard>
        )}
      </div>
    </details>
  );
}
