// FILE: components/verify/VerificationFirstPartnerPathCard.tsx
// Post-verify integration path — visually secondary; verification CTAs stay primary.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  VERIFICATION_FIRST_OFFLINE_CTA,
  VERIFICATION_FIRST_PARTNER_PATH,
  VERIFICATION_FIRST_VERIFIER_INSTALL,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function VerificationFirstPartnerPathCard() {
  return (
    <details
      style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "0.35rem 0.85rem 0.85rem",
      }}
    >
      <summary
        style={{
          fontFamily: FONT,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          cursor: "pointer",
          padding: "0.45rem 0",
          listStylePosition: "outside",
        }}
      >
        {VERIFICATION_FIRST_OFFLINE_CTA.headline}
      </summary>
      <div style={{ display: "grid", gap: "0.65rem", paddingTop: "0.35rem" }}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {VERIFICATION_FIRST_OFFLINE_CTA.teachingDisclaimer}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {VERIFICATION_FIRST_OFFLINE_CTA.body}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          <Btn
            href={VERIFICATION_FIRST_PARTNER_PATH.syntheticBundleHref}
            size="sm"
            variant="ghost"
          >
            {VERIFICATION_FIRST_OFFLINE_CTA.downloadLabel}
          </Btn>
          <Btn
            href={`${VERIFICATION_FIRST_PARTNER_PATH.offlineWorkspaceHref}#independent-verifier`}
            size="sm"
            variant="ghost"
          >
            {VERIFICATION_FIRST_OFFLINE_CTA.workspaceLabel}
          </Btn>
        </div>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          Tarball install (not public npm)
        </p>
        <pre
          style={{
            fontFamily: MONO,
            fontSize: "0.62rem",
            lineHeight: 1.55,
            margin: 0,
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {VERIFICATION_FIRST_VERIFIER_INSTALL.withRepoAccess.join("\n")}
        </pre>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {VERIFICATION_FIRST_VERIFIER_INSTALL.designPartner}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {VERIFICATION_FIRST_VERIFIER_INSTALL.trustPin}
        </p>
        <Link
          href={VERIFICATION_FIRST_PARTNER_PATH.applyHref}
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            fontWeight: 600,
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          {VERIFICATION_FIRST_OFFLINE_CTA.applyLabel} →
        </Link>
      </div>
    </details>
  );
}