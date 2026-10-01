"use client";
// FILE: components/admin/DesignPartnerOperatorProgress.tsx
// Internal operator view of design-partner stage — backend truth only.

import { presentDesignPartnerOperatorView } from "@/lib/admin/operatorPresentation";
import type { DesignPartnerPilotSummaryDto } from "@/lib/admin/designPartnerPilotSummary";
import { PILOT_SUMMARY_BLOCKER_COPY } from "@/lib/admin/designPartnerPilotSummary";
import type { DesignPartnerApplicationAdminDto } from "@/lib/admin/designPartnerApplicationDetailContract";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export function DesignPartnerOperatorProgress({
  app,
  pilotSummary,
}: {
  app: DesignPartnerApplicationAdminDto;
  pilotSummary?: DesignPartnerPilotSummaryDto | null;
}) {
  const presentation = presentDesignPartnerOperatorView({
    company: app.company,
    status: app.status,
    promotedPartnerId: app.promoted_partner_id,
    integrationType: app.integration_type,
    useCase: app.use_case,
    phase: pilotSummary?.phase ?? null,
    blockerCodes: pilotSummary?.blocker_codes ?? [],
  });

  const blockers = pilotSummary?.blocker_codes ?? [];

  return (
    <div style={{
      padding: "0.75rem", borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)",
      display: "grid", gap: "0.45rem",
    }}>
      <p style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: 0 }}>
        Operator progress
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, margin: 0 }}>
        {presentation.stateLabel}
      </p>
      {app.promoted_partner_id && (
        <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
          Partner ID: {app.promoted_partner_id}
        </p>
      )}
      {pilotSummary && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
          Pilot phase: {pilotSummary.phase.replace(/_/g, " ")}
        </p>
      )}
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.45 }}>
        Next: {presentation.nextAction}
      </p>
      {blockers.length > 0 && (
        <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.68rem", color: "#FBBF24", lineHeight: 1.5 }}>
          {blockers.map(code => (
            <li key={code}>{PILOT_SUMMARY_BLOCKER_COPY[code] ?? code}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
