"use client";
// FILE: components/partner/PartnerJourneyLayout.tsx
// Shared partner journey chrome — continuation of partner site, not Abraxas dashboard.

import Link from "next/link";
import { PUBLIC_FONT_SANS, PUBLIC_SURFACE } from "@/lib/design/publicSurface";

const FONT = PUBLIC_FONT_SANS;
const TEAL = "#2DD4BF";

export interface PartnerJourneyLayoutProps {
  partnerName: string;
  intro: string;
  statusMessage: string;
  partnerHomeUrl?: string | null;
  partnerReturnLabel?: string;
  children: React.ReactNode;
}

export function PartnerJourneyLayout({
  partnerName,
  intro,
  statusMessage,
  partnerHomeUrl,
  partnerReturnLabel,
  children,
}: PartnerJourneyLayoutProps) {
  return (
    <div
      data-theme="dark"
      className="partner-journey-layout"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2.5rem)",
        fontFamily: FONT,
        color: "var(--text-primary, #f4f4f5)",
        background: "linear-gradient(180deg, #04050a 0%, #080a12 45%, #060810 100%)",
      }}
    >
      <main
        style={{
          width: "min(100%, 560px)",
          borderRadius: PUBLIC_SURFACE.cardRadius,
          border: PUBLIC_SURFACE.cardBorder,
          background: PUBLIC_SURFACE.cardBackground,
          padding: PUBLIC_SURFACE.cardPadding,
        }}
      >
        <header style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", letterSpacing: "0.12em", color: TEAL, fontWeight: 700 }}>
            PARTNER VERIFICATION
          </p>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "clamp(1.15rem, 3vw, 1.4rem)", fontWeight: 800, lineHeight: 1.25 }}>
            Continue with {partnerName}
          </h1>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary, #d1d5db)" }}>
            {intro}
          </p>
          <p role="status" style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text-muted, #b8c0cc)" }}>
            {statusMessage}
          </p>
        </header>

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

        <p style={{ margin: "1rem 0 0", fontSize: "0.72rem", color: "var(--text-muted, #9ca3af)", lineHeight: 1.5 }}>
          Signing in confirms your account only.{" "}
          <Link href="/privacy" style={{ color: TEAL, textDecoration: "none" }}>Privacy</Link>
        </p>
      </main>
    </div>
  );
}
