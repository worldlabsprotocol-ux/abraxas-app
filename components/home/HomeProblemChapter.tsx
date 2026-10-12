"use client";

import {
  CINEMATIC_PROBLEM_HEADLINE,
  CINEMATIC_PROBLEM_LEAD,
} from "@/lib/home/cinematicHomeCopy";

export function HomeProblemChapter() {
  return (
    <section className="abx-cinematic-chapter abx-cinematic-problem" aria-labelledby="home-problem-heading">
      <p className="abx-v2-eyebrow">The problem</p>
      <h2 id="home-problem-heading" className="abx-v2-section-title">
        {CINEMATIC_PROBLEM_HEADLINE}
      </h2>
      <p className="abx-v2-section-lead">{CINEMATIC_PROBLEM_LEAD}</p>

      <div className="abx-cinematic-problem__compare" role="group" aria-label="Comparison of data sharing approaches">
        <article className="abx-cinematic-problem__panel abx-cinematic-problem__panel--heavy">
          <h3 className="abx-cinematic-problem__panel-title">Repeated full-data collection</h3>
          <ul className="abx-cinematic-problem__list">
            <li>Government ID image</li>
            <li>Date of birth</li>
            <li>Address history</li>
            <li>Biometric capture</li>
          </ul>
          <p className="abx-cinematic-problem__note">Every app stores another copy.</p>
        </article>

        <div className="abx-cinematic-problem__divider" aria-hidden="true">
          <span>vs</span>
        </div>

        <article className="abx-cinematic-problem__panel abx-cinematic-problem__panel--narrow">
          <h3 className="abx-cinematic-problem__panel-title">Narrow verification answer</h3>
          <div className="abx-cinematic-problem__answer">
            <span className="abx-cinematic-problem__answer-label">Simulated policy A</span>
            <strong>PERMIT</strong>
            <span className="abx-cinematic-problem__answer-detail">Age 21+ eligible — no DOB transmitted</span>
          </div>
          <p className="abx-cinematic-problem__note">Partner sees the decision, not the documents.</p>
        </article>
      </div>
    </section>
  );
}
