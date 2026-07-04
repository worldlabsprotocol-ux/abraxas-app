"use client";
// FILE: components/redesign/RedesignHome.tsx

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignHero } from "./RedesignHero";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { TrustMetricsStrip } from "./TrustMetricsStrip";
import { ThreeDoorsSection } from "./ThreeDoorsSection";
import { VisualProofSection } from "./VisualProofSection";
import { ProductLoopDemo } from "./ProductLoopDemo";
import { EcosystemShowcases } from "./EcosystemShowcases";
import { AssetsExplorer } from "./AssetsExplorer";
import { IntegratorStrip } from "./IntegratorStrip";
import { BrowseWithoutKycBanner } from "./BrowseWithoutKycBanner";
import { WhatIsAbraxasSection } from "./WhatIsAbraxasSection";
import { PassportInnovationSection } from "./PassportInnovationSection";
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
          <div style={{ ...MAXW, paddingTop: "0.85rem" }}><WhatIsAbraxasSection /></div>
          <div style={{ ...MAXW, paddingTop: "0.75rem" }}><TrustMetricsStrip /></div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <PassportInnovationSection />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <ThreeDoorsSection />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <VisualProofSection />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <ProductLoopDemo />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <EcosystemShowcases />
          </div>

          <div id="registry" style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <AssetsExplorer title="Public registry" />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <IntegratorStrip />
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
                Built for relying parties.
              </h2>
              <p style={{
                fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
                lineHeight: 1.7, maxWidth: 480, margin: "0 auto 1.25rem",
              }}>
                Paste any credential hash into the public verifier. Partners integrate via POST /api/credentials/verify — no re-KYC required.
              </p>
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Btn href="/verify" size="lg">Run verifier →</Btn>
                <Btn href="/integrations" variant="secondary" size="lg">Integration docs</Btn>
              </div>
            </div>
          </div>
        </main>

        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
