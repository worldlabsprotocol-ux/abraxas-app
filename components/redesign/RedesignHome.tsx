"use client";
// FILE: components/redesign/RedesignHome.tsx
// Cinematic public homepage — thesis-first scroll narrative, then product proof.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import {
  AbraxasTransactionSection,
  CinematicHero,
  DeveloperStorySection,
  PassportHeroObject,
  ProductProofSection,
  ReuseOrbitSection,
  ScrollDisclosureStory,
} from "@/components/home/cinematic/thesis";
import { HomeAudiencePanels } from "@/components/home/HomeAudiencePanels";
import { HomeGoodTroubleIntegration } from "@/components/home/HomeGoodTroubleIntegration";
import { HomeTrustClose } from "@/components/home/HomeTrustClose";
import { VerifyOnceThesisDiagram } from "@/components/product";
import { KineticMarquee } from "@/lib/motion/cinematic";
import { Reveal } from "@/lib/motion/Reveal";
import {
  CINEMATIC_THESIS_LINE_1,
  CINEMATIC_THESIS_LINE_2,
} from "@/lib/home/cinematicHomeCopy";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const MAXW: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(3rem, 8vw, 5rem)";

function HomeContent() {
  return (
    <main
      className="abx-cinematic-home"
      style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem", textAlign: "center" }}
    >
      <KineticMarquee text={`${CINEMATIC_THESIS_LINE_1} ${CINEMATIC_THESIS_LINE_2}`} />

      <div
        className="abx-command-shell abx-cinematic-home__shell"
        style={{
          ...MAXW,
          display: "flex",
          flexDirection: "column",
          gap: SECTION_GAP,
          alignItems: "center",
          width: "100%",
        }}
      >
        <Reveal as="section">
          <CinematicHero />
        </Reveal>

        <Reveal as="section" delay={0.04}>
          <ScrollDisclosureStory />
        </Reveal>

        <Reveal as="section" delay={0.06}>
          <AbraxasTransactionSection />
        </Reveal>

        <Reveal as="section" delay={0.08}>
          <PassportHeroObject />
        </Reveal>

        <Reveal as="section" delay={0.1}>
          <ProductProofSection />
        </Reveal>

        <Reveal as="section" delay={0.12}>
          <VerifyOnceThesisDiagram />
        </Reveal>

        <Reveal as="section" delay={0.14}>
          <ReuseOrbitSection />
        </Reveal>

        <Reveal as="section" delay={0.16}>
          <DeveloperStorySection />
        </Reveal>

        <Reveal as="section" delay={0.18}>
          <HomeGoodTroubleIntegration />
        </Reveal>

        <Reveal as="section" delay={0.2}>
          <HomeAudiencePanels />
        </Reveal>

        <Reveal as="section" delay={0.22}>
          <HomeTrustClose />
        </Reveal>
      </div>
    </main>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <div data-theme="dark" className="abx-institutional-shell abx-command-center abx-cinematic-shell">
        <AmbientGlow />
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
