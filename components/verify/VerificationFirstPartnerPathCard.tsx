// FILE: components/verify/VerificationFirstPartnerPathCard.tsx
// Visible integration path after independent verify — no account gate for download/docs.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  VERIFICATION_FIRST_OFFLINE_CTA,
  VERIFICATION_FIRST_PARTNER_PATH,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,sans-serif";

export function VerificationFirstPartnerPathCard({ compact }: { compact?: boolean }) {
  return (
    <section
      aria-label="Offline verification integration path"
      style={{
        padding: compact ? "0.85rem 1rem" : "1rem 1.1rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        display: "grid",
        gap: compact ? "0.5rem" : "0.65rem",
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            margin: "0 0 0.35rem",
          }}
        >
          {VERIFICATION_FIRST_OFFLINE_CTA.headline}
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {VERIFICATION_FIRST_OFFLINE_CTA.body}
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        <Btn
          href={VERIFICATION_FIRST_PARTNER_PATH.syntheticBundleHref}
          size="sm"
          variant="secondary"
        >
          {VERIFICATION_FIRST_OFFLINE_CTA.downloadLabel}
        </Btn>
        <Btn href={VERIFICATION_FIRST_PARTNER_PATH.offlineWorkspaceHref} size="sm" variant="ghost">
          {VERIFICATION_FIRST_OFFLINE_CTA.workspaceLabel}
        </Btn>
        {!compact && (
          <Link
            href={VERIFICATION_FIRST_PARTNER_PATH.applyHref}
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--accent)",
              alignSelf: "center",
              textDecoration: "none",
            }}
          >
            {VERIFICATION_FIRST_OFFLINE_CTA.applyLabel} →
          </Link>
        )}
      </div>
    </section>
  );
}