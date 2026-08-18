// FILE: app/dashboard/page.tsx
// Legacy URL — honest transition screen to Passport (no redirect, no demo metrics).

import { RedesignShell } from "@/components/redesign/RedesignShell";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import {
  DASHBOARD_LEGACY_BODY,
  DASHBOARD_LEGACY_CTA,
  DASHBOARD_LEGACY_EYEBROW,
  DASHBOARD_LEGACY_TITLE,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function DashboardPage() {
  return (
    <RedesignShell>
      <div style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "clamp(2rem, 6vw, 3.5rem) clamp(1rem, 3vw, 2rem)",
      }}>
        <div style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "var(--accent)",
          marginBottom: "0.65rem",
        }}>
          {DASHBOARD_LEGACY_EYEBROW}
        </div>
        <h1 style={{
          fontFamily: FONT,
          fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
          fontWeight: 800,
          lineHeight: 1.15,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          margin: "0 0 0.85rem",
        }}>
          {DASHBOARD_LEGACY_TITLE}
        </h1>
        <ContentCard>
          <p style={{
            fontFamily: FONT,
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            margin: "0 0 1.25rem",
          }}>
            {DASHBOARD_LEGACY_BODY}
          </p>
          <Btn href="/passport" size="lg">
            {DASHBOARD_LEGACY_CTA}
          </Btn>
        </ContentCard>
      </div>
      <RedesignFooter />
    </RedesignShell>
  );
}
