"use client";
// FILE: components/redesign/RedesignHome.tsx
// Verification-first homepage for mass adoption. Cielo flagship, then credential moat.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignHero } from "./RedesignHero";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { TrustMetricsStrip } from "./TrustMetricsStrip";
import { FeaturedFlagship } from "./FeaturedFlagship";
import { VerificationFlow } from "./VerificationFlow";
import { AssetsExplorer } from "./AssetsExplorer";
import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { VerificationPackages } from "@/components/terminal/VerificationPackages";
import { HomeFAQTeaser } from "./HomeFAQTeaser";
import { RoadmapCTA } from "./RoadmapCTA";
import { RedesignFooter } from "./RedesignFooter";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

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
          {/* Hero: verification value prop */}
          <div style={MAXW}>
            <RedesignHero />
          </div>

          {/* Trust strip */}
          <div style={{ ...MAXW, paddingTop: "0.5rem" }}>
            <TrustMetricsStrip />
          </div>

          {/* Flagship: Cielo Sunrise (cash-yielding proof) */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <FeaturedFlagship />
          </div>

          {/* How verification works — 3 steps */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerificationFlow />
          </div>

          {/* Passport demo */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <div style={{
              fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#10B981", marginBottom: "0.75rem",
            }}>
              Your credential
            </div>
            <h2 style={{
              fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.05,
              color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 640,
            }}>
              This is what verified looks like.
            </h2>
            <p style={{
              fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
              lineHeight: 1.7, maxWidth: 560, margin: "0 0 1.5rem",
            }}>
              Yours starts empty. Each stamp is earned through a real process — not bought,
              not faked. Get verified to unlock booking, investing, and asset submission.
            </p>
            <AbraxasPassport
              onGetVerified={() => { window.location.href = "/passport"; }}
              earnedStamps={["identity","biometric","business","owner","royalty","property","tribal","compliance","lending"]}
            />
          </div>

          {/* Other verified assets (Cielo excluded — featured above) */}
          <div id="assets" style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <AssetsExplorer excludeIds={["genesis-asset"]} title="More on the network" />
          </div>

          {/* Verification pricing */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerificationPackages />
          </div>

          {/* FAQ teaser + roadmap */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <HomeFAQTeaser />
            <div style={{ marginTop: "1.5rem" }}>
              <RoadmapCTA />
            </div>
          </div>

          {/* Final CTA */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}>
            <div style={{
              textAlign: "center", padding: "2.5rem 1.5rem",
              borderRadius: 20, background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}>
              <h2 style={{
                fontFamily: FONT, fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
                fontWeight: 800, color: "var(--text-primary)",
                margin: "0 0 0.75rem", letterSpacing: "-0.02em",
              }}>
                Start with verification. Everything else follows.
              </h2>
              <p style={{
                fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
                lineHeight: 1.7, maxWidth: 440, margin: "0 auto 1.25rem",
              }}>
                No wallet required. Most people finish Precheck in under five minutes.
              </p>
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Btn href="/passport" size="lg">Get verified →</Btn>
                <Btn href="/flagship" variant="secondary" size="lg">See Cielo Sunrise</Btn>
              </div>
            </div>
          </div>
        </main>

        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
