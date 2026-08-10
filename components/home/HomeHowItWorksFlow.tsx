"use client";
// FILE: components/home/HomeHowItWorksFlow.tsx
// Four-step product flow — verify through signed outcome.

import {
  HOME_HOW_IT_WORKS_HEADLINE,
  HOME_HOW_IT_WORKS_STEPS,
} from "@/lib/home/commercialHomeContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeHowItWorksFlow() {
  return (
    <section
      aria-labelledby="home-how-it-works-heading"
      className="abx-home-section-center"
      style={{ width: "100%" }}
    >
      <div className="abx-home-intro">
        <h2 id="home-how-it-works-heading" className="abx-home-section-title" style={{ fontFamily: FONT }}>
          {HOME_HOW_IT_WORKS_HEADLINE}
        </h2>
      </div>
      <ol className="abx-home-flow-grid">
        {HOME_HOW_IT_WORKS_STEPS.map((item) => (
          <li key={item.step} className="abx-home-flow-step">
            <div className="abx-home-flow-step-num" aria-hidden="true">
              {item.step}
            </div>
            <h3 className="abx-home-flow-step-title">{item.title}</h3>
            <p className="abx-home-flow-step-summary">{item.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
