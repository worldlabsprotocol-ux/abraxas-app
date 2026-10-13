"use client";

import { CINEMATIC_HOW_HEADLINE, CINEMATIC_HOW_STAGES } from "@/lib/home/cinematicHomeCopy";

export function HomeHowItWorksStrip() {
  return (
    <section className="abx-cinematic-chapter abx-cinematic-how" aria-labelledby="home-how-heading">
      <p className="abx-v2-eyebrow">Three stages</p>
      <h2 id="home-how-heading" className="abx-v2-section-title">
        {CINEMATIC_HOW_HEADLINE}
      </h2>
      <ol className="abx-cinematic-how__steps">
        {CINEMATIC_HOW_STAGES.map((stage, index) => (
          <li key={stage.id} className="abx-cinematic-how__step">
            <span className="abx-cinematic-how__index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="abx-cinematic-how__step-title">{stage.title}</h3>
              <p className="abx-cinematic-how__step-body">{stage.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
