"use client";
// FILE: components/partner/PartnerJourneyLayout.tsx
// Shared partner journey chrome — continuation of partner site, not Abraxas dashboard.

import { HolderRequestBriefCard } from "@/components/partner/HolderRequestBriefCard";
import type { HolderRequestBrief } from "@/lib/partner/holderExperience";
import {
  ABX_FONT_SANS,
  ABX_PAGE_BACKGROUNDS,
  ABX_SPACING,
  ABX_TAB_ACCENTS,
  ABX_TYPOGRAPHY,
  abxAccentCssVars,
} from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const PARTNER_ACCENT = ABX_TAB_ACCENTS.partner;

export interface PartnerJourneyLayoutProps {
  partnerName: string;
  intro: string;
  statusMessage: string;
  partnerHomeUrl?: string | null;
  partnerReturnLabel?: string;
  showAccountFooter?: boolean;
  eyebrow?: string;
  title?: string;
  hideStatus?: boolean;
  brief?: HolderRequestBrief | null;
  children: React.ReactNode;
}

export function PartnerJourneyLayout({
  partnerName,
  intro,
  statusMessage,
  partnerHomeUrl,
  partnerReturnLabel,
  showAccountFooter = true,
  eyebrow,
  title,
  hideStatus = false,
  brief = null,
  children,
}: PartnerJourneyLayoutProps) {
  return (
    <div
      data-theme="dark"
      className="partner-journey-layout"
      style={{
        ...abxAccentCssVars("partner"),
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2.5rem)",
        fontFamily: FONT,
        color: "var(--text-primary, #f4f4f5)",
        background: ABX_PAGE_BACKGROUNDS.partnerJourney,
        overflowX: "hidden",
      }}
    >
      <AbxCard
        accent="partner"
        padding={ABX_SPACING.cardPadding}
        style={{ width: "min(100%, 560px)", maxWidth: "100%", boxShadow: PARTNER_ACCENT.glow, overflowWrap: "anywhere" }}
      >
        <header style={{ marginBottom: "1.25rem" }}>
          <p
            style={{
              margin: "0 0 0.35rem",
              fontFamily: FONT,
              ...ABX_TYPOGRAPHY.eyebrow,
              color: PARTNER_ACCENT.color,
            }}
          >
            {eyebrow ?? "Partner verification"}
          </p>
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontFamily: FONT,
              ...ABX_TYPOGRAPHY.h1,
            }}
          >
            {title ?? `Continue with ${partnerName}`}
          </h1>
          {intro && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary, #d1d5db)" }}>
              {intro}
            </p>
          )}
          {!hideStatus && statusMessage && (
            <p role="status" style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text-muted, #b8c0cc)" }}>
              {statusMessage}
            </p>
          )}
        </header>

        {brief && <HolderRequestBriefCard brief={brief} />}

        {children}

        {partnerHomeUrl && partnerReturnLabel && (
          <footer style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <a
              href={partnerHomeUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "0.72rem 1rem",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                color: "var(--text-primary, #f4f4f5)",
                fontWeight: 700,
                fontSize: "0.86rem",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              {partnerReturnLabel}
            </a>
          </footer>
        )}

        {showAccountFooter && (
          <p style={{ margin: "1rem 0 0", fontSize: "0.72rem", color: "var(--text-muted, #9ca3af)", lineHeight: 1.5 }}>
            Signing in confirms your account only.{" "}
            <Link href="/legal/privacy" style={{ color: PARTNER_ACCENT.color, textDecoration: "none" }}>Privacy</Link>
          </p>
        )}
      </AbxCard>
    </div>
  );
}
