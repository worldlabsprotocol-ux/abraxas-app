"use client";

import {
  HOMEPAGE_DISCOVERY_BEGIN,
  HOMEPAGE_DISCOVERY_PILLARS,
  HOMEPAGE_DISCOVERY_PROBLEM,
} from "@/lib/home/homepageDiscovery";

export function HomeDiscoveryStory({
  activePillar,
  onSelectPillar,
}: {
  activePillar: number;
  onSelectPillar: (index: number) => void;
}) {
  return (
    <section className="abx-discovery" aria-labelledby="abx-discovery-problem-title">
      <div className="abx-discovery__problem">
        <p className="abx-v2-eyebrow">{HOMEPAGE_DISCOVERY_PROBLEM.eyebrow}</p>
        <h2 id="abx-discovery-problem-title">{HOMEPAGE_DISCOVERY_PROBLEM.title}</h2>
        <p>{HOMEPAGE_DISCOVERY_PROBLEM.body}</p>
        <p>{HOMEPAGE_DISCOVERY_PROBLEM.product}</p>
      </div>
      <ul className="abx-discovery__collage" aria-label="What a decision needs">
        {HOMEPAGE_DISCOVERY_PILLARS.map((pillar, index) => {
          const selected = index === activePillar;
          return (
            <li key={pillar.id}>
            <button
              type="button"
              className={`abx-discovery__card${selected ? " abx-discovery__card--active" : ""}`}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelectPillar(index)}
            >
              <span className="abx-discovery__card-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="abx-discovery__card-label">{pillar.label}</span>
              <span className="abx-discovery__card-summary">{pillar.summary}</span>
              {selected ? <span className="abx-discovery__card-detail">{pillar.detail}</span> : null}
            </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HomeDiscoveryBegin() {
  return (
    <section className="abx-discovery abx-discovery--begin" aria-labelledby="abx-discovery-begin-title">
      <div className="abx-discovery__problem">
        <p className="abx-v2-eyebrow">{HOMEPAGE_DISCOVERY_BEGIN.eyebrow}</p>
        <h2 id="abx-discovery-begin-title">{HOMEPAGE_DISCOVERY_BEGIN.title}</h2>
        <p>{HOMEPAGE_DISCOVERY_BEGIN.body}</p>
      </div>
      <div className="abx-discovery__examples">
        <p className="abx-discovery__examples-title">{HOMEPAGE_DISCOVERY_BEGIN.examplesTitle}</p>
        <ul>
          {HOMEPAGE_DISCOVERY_BEGIN.examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        <p className="abx-discovery__disclaimer">{HOMEPAGE_DISCOVERY_BEGIN.disclaimer}</p>
      </div>
    </section>
  );
}
