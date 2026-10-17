"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  CINEMATIC_GT_DEMO_DETAILS,
  CINEMATIC_GT_SECTION_HEADLINE,
  CINEMATIC_GT_SECTION_LEAD,
} from "@/lib/home/cinematicHomeCopy";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";

const HomeGoodTroubleProductionDemoVideo = dynamic(
  () =>
    import("@/components/home/HomeGoodTroubleProductionDemoVideo").then(
      (m) => m.HomeGoodTroubleProductionDemoVideo,
    ),
  { ssr: false },
);

export function HomeGoodTroubleActionSection() {
  const [armed, setArmed] = useState(false);

  return (
    <section
      id="see-abraxas-in-action"
      className="abx-cinematic-chapter abx-gt-action"
      aria-labelledby="home-gt-action-heading"
    >
      <p className="abx-v2-eyebrow">Demonstration</p>
      <h2 id="home-gt-action-heading" className="abx-v2-section-title">
        {CINEMATIC_GT_SECTION_HEADLINE}
      </h2>
      <p className="abx-v2-section-lead">{CINEMATIC_GT_SECTION_LEAD}</p>
      <details className="abx-gt-action__details">
        <summary>About this demonstration</summary>
        <p>{CINEMATIC_GT_DEMO_DETAILS}</p>
      </details>

      <LazyHomeSection minHeight="420px">
        <div className="abx-gt-action__player">
          {!armed ? (
            <button
              type="button"
              className="abx-gt-action__arm"
              onClick={() => setArmed(true)}
            >
              Load partner demonstration video
            </button>
          ) : (
            <HomeGoodTroubleProductionDemoVideo />
          )}
        </div>
      </LazyHomeSection>
    </section>
  );
}
