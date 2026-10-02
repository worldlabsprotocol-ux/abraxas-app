"use client";
// FILE: components/redesign/RedesignHome.tsx
// Cinematic public homepage — continuous thesis scroll narrative.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import {
  AbraxasTransactionSection,
  CinematicHero,
  DeveloperStorySection,
  NarrativeSectionBridge,
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
import {
  CINEMATIC_THESIS_LINE_1,
  CINEMATIC_THESIS_LINE_2,
} from "@/lib/home/cinematicHomeCopy";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const MAXW: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

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
          gap: "var(--abx-cinematic-gap, clamp(3rem, 8vw, 5rem))",
          alignItems: "center",
          width: "100%",
        }}
      >
        <section>
          <CinematicHero />
        </section>

        <NarrativeSectionBridge label="Selective disclosure" />

        <section>
          <ScrollDisclosureStory />
        </section>

        <NarrativeSectionBridge label="The transaction" direction="forward" />

        <section>
          <AbraxasTransactionSection />
        </section>

        <NarrativeSectionBridge label="Your Passport" />

        <section>
          <PassportHeroObject />
        </section>

        <section>
          <ProductProofSection />
        </section>

        <NarrativeSectionBridge label="Verify once" />

        <section>
          <VerifyOnceThesisDiagram />
        </section>

        <section>
          <ReuseOrbitSection />
        </section>

        <NarrativeSectionBridge label="Infrastructure" />

        <section>
          <DeveloperStorySection />
        </section>

        <NarrativeSectionBridge label="Production proof" />

        <section>
          <HomeGoodTroubleIntegration />
        </section>

        <section>
          <HomeAudiencePanels />
        </section>

        <section>
          <HomeTrustClose />
        </section>
      </div>
    </main>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <div
        data-theme="dark"
        data-motion-tier="cinematic"
        className="abx-institutional-shell abx-command-center abx-cinematic-shell"
        style={abxMotionCssVars()}
      >
        <AmbientGlow />
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
