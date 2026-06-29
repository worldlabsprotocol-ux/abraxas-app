"use client";
// FILE: components/redesign/RedesignHome.tsx
// Installment 1 of the from-scratch redesign. Dark premium theme scoped
// to this page via data-theme="dark" so legacy routes are untouched.
// Reuses real content components (Passport, Verified Network, Packages).

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignHero } from "./RedesignHero";
import { AssetsExplorer } from "./AssetsExplorer";
import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { VerifiedNetworkSection } from "@/components/terminal/VerifiedNetworkSection";
import { VerificationPackages } from "@/components/terminal/VerificationPackages";
import { PartnersSection } from "@/components/terminal/PartnersSection";
import { CloveCaseStudy } from "@/components/terminal/CloveCaseStudy";
import { MusicSection } from "@/components/terminal/MusicSection";
import { MilestonesSection } from "@/components/terminal/MilestonesSection";
import { ProtocolVisionSection } from "@/components/terminal/ProtocolVisionSection";
import { RedesignFAQ } from "./RedesignFAQ";

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
      <div data-theme="dark" style={{
        background: "var(--bg)", color: "var(--text-primary)",
        minHeight: "100vh", position: "relative", overflowX: "hidden",
      }}>
        <AmbientGlow />
        <RedesignNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          <div style={MAXW}>
            <RedesignHero />
          </div>

          {/* Verified Assets Explorer */}
          <div id="assets" style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <AssetsExplorer />
          </div>

          {/* The Passport */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <SectionLabel>The Abraxas Passport</SectionLabel>
            <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                          letterSpacing: "-0.03em", lineHeight: 1.05,
                          color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 720 }}>
              One credential. Every door it opens.
            </h2>
            <p style={{ fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
                         lineHeight: 1.7, maxWidth: 620, margin: "0 0 1.75rem" }}>
              Your verification lives as a portable, soul-bound credential. Below is a fully
              verified Passport, yours starts empty and fills in as you complete each stamp.
            </p>
            <AbraxasPassport
              onGetVerified={() => { window.location.href = "/passport"; }}
              earnedStamps={["identity","biometric","business","investor","owner","royalty","property","tribal","compliance","lending","social"]}
            />
          </div>

          {/* The Verified Network */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerifiedNetworkSection />
          </div>

          {/* Verification Partners */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <PartnersSection />
          </div>

          {/* The Clove — completed-cycle proof */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <CloveCaseStudy />
          </div>

          {/* Music & royalties vertical */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <MusicSection />
          </div>

          {/* Verification Packages */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerificationPackages />
          </div>

          {/* Milestones */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <MilestonesSection />
          </div>

          {/* Protocol vision */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <ProtocolVisionSection onGetStarted={() => { window.location.href = "/passport"; }} />
          </div>

          {/* FAQ */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}>
            <RedesignFAQ />
          </div>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
          <div style={{ ...MAXW, paddingTop: "2rem", paddingBottom: "2.5rem",
                         display: "flex", justifyContent: "space-between", alignItems: "center",
                         flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Abraxas, the verification and identity layer for real-world assets onchain.
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem",
                           color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              VERIFY ONCE · TRANSACT EVERYWHERE
            </div>
          </div>
        </footer>
      </div>
    </WalletContextProvider>
  );
}
