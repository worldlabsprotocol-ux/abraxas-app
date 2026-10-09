"use client";
// FILE: components/partner/PartnerJourneyLayout.tsx
// Shared partner journey chrome — continuation of partner site, not Abraxas dashboard.

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AbxCard } from "@/components/design/AbxPrimitives";
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
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { abxObjectEnterVariants } from "@/lib/motion/abxMotionFramer";

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
  hideHeader?: boolean;
  hideIntro?: boolean;
  brief?: HolderRequestBrief | null;
  policyId?: string;
  purpose?: string | null;
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
  hideHeader = false,
  hideIntro = false,
  brief = null,
  policyId = "",
  purpose = null,
  children,
}: PartnerJourneyLayoutProps) {
  const reduce = useReducedMotion();

  return (
    <div
      data-theme="dark"
      data-motion-tier="calm"
      className="partner-journey-layout abx-product-journey abx-partner-surface"
      style={{
        ...abxAccentCssVars("partner"),
        ...abxMotionCssVars(),
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2.5rem)",
        fontFamily: FONT,
        color: "var(--text-primary, #f4f4f5)",
        background: ABX_PAGE_BACKGROUNDS.partnerJourney,
        overflowX: "clip",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <motion.div
        variants={abxObjectEnterVariants({ reduce: !!reduce, tier: "calm" })}
        initial="hidden"
        animate="show"
        style={{ width: "min(100%, 560px)", maxWidth: "100%" }}
      >
        <AbxCard
          accent="partner"
          padding={ABX_SPACING.cardPadding}
          className="abx-card abx-product-journey__card"
          style={{ width: "100%", boxShadow: PARTNER_ACCENT.glow, overflowWrap: "anywhere" }}
        >
          {!hideHeader && (
            <header className="abx-product-journey__header" style={{ marginBottom: "1.25rem" }}>
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
                  margin: brief ? "0 0 0.35rem" : "0 0 0.5rem",
                  fontFamily: FONT,
                  ...(brief ? { fontSize: "1.05rem", fontWeight: 800 } : ABX_TYPOGRAPHY.h1),
                }}
              >
                {title ?? (brief ? "Review this request" : `Continue with ${partnerName}`)}
              </h1>
              {intro && !hideIntro && !brief && (
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
          )}

          {brief && (
            <HolderRequestBriefCard
              brief={brief}
              partnerName={partnerName}
              policyId={policyId}
              purpose={purpose}
            />
          )}

          {children}

          {partnerHomeUrl && partnerReturnLabel && (
            <footer className="abx-product-journey__return" style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <a
                href={partnerHomeUrl}
                className="abx-product-journey__return-link"
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
      </motion.div>
    </div>
  );
}
