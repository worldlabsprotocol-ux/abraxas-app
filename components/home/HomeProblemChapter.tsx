"use client";

import {
  CINEMATIC_PROBLEM_HEADLINE,
  CINEMATIC_PROBLEM_LEAD,
} from "@/lib/home/cinematicHomeCopy";

export function HomeProblemChapter() {
  return (
    <div className="abx-premium-problem">
      <div className="abx-premium-problem__band">
        <p className="abx-v2-eyebrow">The problem</p>
        <h2 id="home-problem-heading" className="abx-premium-problem__headline">
          {CINEMATIC_PROBLEM_HEADLINE}
        </h2>
      </div>
      <div className="abx-premium-problem__grid">
        <p className="abx-premium-problem__lead">{CINEMATIC_PROBLEM_LEAD}</p>
        <div className="abx-premium-problem__compare" role="group" aria-label="Comparison of data sharing approaches">
          <article className="abx-premium-problem__panel abx-premium-problem__panel--heavy">
            <h3 className="abx-premium-problem__panel-title">Repeated full-data collection</h3>
            <ul className="abx-premium-problem__list">
              <li>Government ID image</li>
              <li>Date of birth</li>
              <li>Address history</li>
              <li>Biometric capture</li>
            </ul>
            <p className="abx-premium-problem__note">Every app stores another copy.</p>
          </article>

          <article className="abx-premium-problem__panel abx-premium-problem__panel--narrow">
            <h3 className="abx-premium-problem__panel-title">Narrow verification answer</h3>
            <div className="abx-premium-problem__answer">
              <span className="abx-premium-problem__answer-label">Simulated policy A</span>
              <strong>PERMIT</strong>
              <span className="abx-premium-problem__answer-detail">Age 21+ eligible — no DOB transmitted</span>
            </div>
            <p className="abx-premium-problem__note">Partner sees the decision, not the documents.</p>
          </article>
        </div>
      </div>
    </div>
  );
}
