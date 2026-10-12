"use client";

import dynamic from "next/dynamic";
import {
  CINEMATIC_GT_PARTNER_DISCLAIMER,
  CINEMATIC_GT_SECTION_HEADLINE,
  CINEMATIC_GT_SECTION_LEAD,
} from "@/lib/home/cinematicHomeCopy";
const HomeGoodTroubleProductionDemoVideo = dynamic(
  () =>
    import("@/components/home/HomeGoodTroubleProductionDemoVideo").then(
      (m) => m.HomeGoodTroubleProductionDemoVideo,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="abx-gt-action__video-placeholder"
        role="status"
        aria-label="Partner demonstration video loading"
      />
    ),
  },
);

export function HomeGoodTroubleActionSection() {
  return (
    <section
      id="see-abraxas-in-action"
      className="abx-cinematic-chapter abx-gt-action"
      aria-labelledby="home-gt-action-heading"
    >
      <p className="abx-v2-eyebrow">Partner demonstration</p>
      <h2 id="home-gt-action-heading" className="abx-v2-section-title">
        {CINEMATIC_GT_SECTION_HEADLINE}
      </h2>
      <p className="abx-v2-section-lead">{CINEMATIC_GT_SECTION_LEAD}</p>
      <p className="abx-gt-action__disclaimer">{CINEMATIC_GT_PARTNER_DISCLAIMER}</p>

      <div className="abx-gt-action__player">
        <HomeGoodTroubleProductionDemoVideo />
      </div>
    </section>
  );
}
