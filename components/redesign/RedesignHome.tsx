"use client";
// FILE: components/redesign/RedesignHome.tsx

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignHero } from "./RedesignHero";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { TrustMetricsStrip } from "./TrustMetricsStrip";
import { FeaturedFlagship } from "./FeaturedFlagship";
import { VerificationFlow } from "./VerificationFlow";
import { AssetsExplorer } from "./AssetsExplorer";
import { MarketIntelFeed } from "./MarketIntelFeed";
import { IntegratorStrip } from "./IntegratorStrip";
import { SuiMacroStrip } from "./SuiMacroStrip";
import { OnboardingChoiceSection } from "./OnboardingChoiceSection";
import { BrowseWithoutKycBanner } from "./BrowseWithoutKycBanner";
import { WhyVerificationStorySection } from "./WhyVerificationStorySection";
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
          <div style={MAXW}><RedesignHero /></div>
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><BrowseWithoutKycBanner /></div>
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <OnboardingChoiceSection />
          </div>
          <div style={{ ...MAXW, paddingTop: "0.5rem" }}><TrustMetricsStrip /></div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <FeaturedFlagship />
          </div>

          <div id="assets" style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <AssetsExplorer title="Verified assets" />
          </div>

          <div style={{ ...MAXW, paddingTop: "1rem" }}>
            <SuiMacroStrip />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <MarketIntelFeed />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerificationFlow />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <WhyVerificationStorySection />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <IntegratorStrip />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <div style={{
              fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#10B981", marginBottom: "0.75rem",
            }}>
              Your account
            </div>
            <h2 style={{
              fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.05,
              color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 640,
            }}>
              One sign-in. Stamps you earn over time.
            </h2>
            <p style={{
              fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
              lineHeight: 1.7, maxWidth: 560, margin: "0 0 1.5rem",
            }}>
              Sign in with Google to book, pay, and submit deals. Add an optional ID check when a protocol requires enhanced trust.
            </p>
            <AbraxasPassport
              onGetVerified={() => { window.location.href = "/passport"; }}
              earnedStamps={["identity","biometric","business","owner","royalty","property","tribal","compliance","lending"]}
            />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VerificationPackages />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <HomeFAQTeaser />
            <div style={{ marginTop: "1.5rem" }}><RoadmapCTA /></div>
          </div>

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
                Book Cielo. Sign in when you're ready.
              </h2>
              <p style={{
                fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
                lineHeight: 1.7, maxWidth: 480, margin: "0 auto 1.25rem",
              }}>
                Browse the full platform today. Reserve Cielo Sunrise, sign in with Google to pay, and add an ID check only if a deal requires it.
              </p>
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Btn href="/flagship" size="lg">Book Cielo Sunrise →</Btn>
                <Btn href="/passport" variant="secondary" size="lg">Sign in</Btn>
              </div>
            </div>
          </div>
        </main>

        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
