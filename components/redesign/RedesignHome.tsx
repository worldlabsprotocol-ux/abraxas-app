"use client";
// FILE: components/redesign/RedesignHome.tsx
// Dark premium homepage. Assets-first flow, verification moat, then verticals.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignHero } from "./RedesignHero";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { TrustMetricsStrip } from "./TrustMetricsStrip";
import { AssetsExplorer } from "./AssetsExplorer";
import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { VerifiedNetworkSection } from "@/components/terminal/VerifiedNetworkSection";
import { VerificationPackages } from "@/components/terminal/VerificationPackages";
import { PartnersSection } from "@/components/terminal/PartnersSection";
import { CloveCaseStudy } from "@/components/terminal/CloveCaseStudy";
import { MusicRoyaltySection } from "./MusicRoyaltySection";
import { ProtocolVisionSection } from "@/components/terminal/ProtocolVisionSection";
import { RoadmapCTA } from "./RoadmapCTA";
import { CategoryLearnStrip } from "@/components/home/CategoryLearnStrip";
import { HomeProductionStatusStrip } from "@/components/home/HomeProductionStatusStrip";
import { RedesignFAQ } from "./RedesignFAQ";
import { RedesignFooter } from "./RedesignFooter";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                   letterSpacing: "0.14em", textTransform: "uppercase",
                   color: "#10B981", marginBottom: "0.75rem" }}>
      {children}
    </div>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <AbraxasBootScreen />
      <div data-theme="dark" style={{
        background: "var(--bg)", color: "var(--text-primary)",
        minHeight: "100vh", position: "relative", overflowX: "hidden",
      }}>
        <AmbientGlow />
        <RedesignNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* 1 · Hero + primary CTA */}
          <div style={MAXW}>
            <RedesignHero />
            <HomeProductionStatusStrip />
            <CategoryLearnStrip />
          </div>

          {/* 2 · Trust metrics */}
          <div style={{ ...MAXW, paddingTop: "0.5rem" }}>
            <TrustMetricsStrip />
          </div>

          {/* 3 · Verified assets (the product) */}
          <div id="assets" style={{ ...MAXW, paddingTop: "0.5rem" }}>
            <AssetsExplorer />
          </div>

          {/* 4 · Proof: completed cycle */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <CloveCaseStudy />
          </div>

          {/* 5 · Passport moat */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <SectionLabel>The Abraxas Passport</SectionLabel>
            <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                          letterSpacing: "-0.03em", lineHeight: 1.05,
                          color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 720 }}>
              One credential. Every door it opens.
            </h2>
            <p style={{ fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
                         lineHeight: 1.7, maxWidth: 620, margin: "0 0 0.5rem" }}>
              Your verification lives as a portable, soul-bound credential. Below is a fully
              verified Passport, yours starts empty and fills in as you complete each stamp.
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 1.75rem" }}>
              <a href="/trust-framework#trust-over-time" style={{ color: "#10B981", fontWeight: 700, textDecoration: "none" }}>
                How verification stays current over time →
              </a>
            </p>
            <AbraxasPassport
              onGetVerified={() => { window.location.href = "/passport"; }}
              earnedStamps={["identity","biometric","business","investor","owner","royalty","property","tribal","compliance","lending","social"]}
            />
          </div>

          {/* 6 · Network effect */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerifiedNetworkSection />
          </div>

          {/* 7 · Verification pricing */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerificationPackages />
          </div>

          {/* 8 · Music & IP vertical */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <MusicRoyaltySection />
          </div>

          {/* 9 · Partners */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <PartnersSection />
          </div>

          {/* 10 · Vision + roadmap link (no duplicate milestone timeline) */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <ProtocolVisionSection onGetStarted={() => { window.location.href = "/passport"; }} />
            <div style={{ marginTop: "1.5rem" }}>
              <RoadmapCTA />
            </div>
          </div>

          {/* 11 · FAQ */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}>
            <RedesignFAQ />
          </div>
        </main>

        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
