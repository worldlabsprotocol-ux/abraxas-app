"use client";
// FILE: components/home/HomeWhyDefensibleSection.tsx

import {
  HOMEPAGE_DEFENSIBLE_CLOSER,
  HOMEPAGE_DEFENSIBLE_CLOSER_ACCENT,
  HOMEPAGE_DEFENSIBLE_HEADING,
  HOMEPAGE_DEFENSIBLE_LEAD,
  HOMEPAGE_DEFENSIBLE_LEAD_ACCENT,
  HOMEPAGE_DEFENSIBLE_PANELS,
} from "@/lib/home/homepageTrustArchitectureCopy";
import { DefensiblePanelIcon } from "@/components/home/trust-arch/HomeTrustArchitectureIcons";

export function HomeWhyDefensibleSection() {
  return (
    <section id="why-defensible" className="abx-home-trust-arch abx-home-trust-arch--defensible" aria-labelledby="home-defensible-heading">
      <h2 id="home-defensible-heading" className="abx-v2-section-title">
        {HOMEPAGE_DEFENSIBLE_HEADING}
      </h2>
      <p className="abx-v2-section-lead abx-v2-section-lead--tight">
        {HOMEPAGE_DEFENSIBLE_LEAD}
        <span className="abx-home-trust-arch__lead-accent">{HOMEPAGE_DEFENSIBLE_LEAD_ACCENT}</span>
      </p>
      <div className="abx-home-trust-arch__accent-rule" aria-hidden="true" />

      <ul className="abx-home-defensible-panels">
        {HOMEPAGE_DEFENSIBLE_PANELS.map((panel) => (
          <li key={panel.id}>
            <article className="abx-home-defensible-panels__card">
              <div className="abx-home-defensible-panels__orbit" aria-hidden="true">
                <DefensiblePanelIcon id={panel.id} />
              </div>
              <h3 className="abx-home-defensible-panels__title">{panel.title}</h3>
              <p className="abx-home-defensible-panels__body">{panel.body}</p>
            </article>
          </li>
        ))}
      </ul>

      <p className="abx-home-trust-arch__closer abx-home-trust-arch__closer--defensible">
        {HOMEPAGE_DEFENSIBLE_CLOSER}
        <span className="abx-home-trust-arch__closer-accent">{HOMEPAGE_DEFENSIBLE_CLOSER_ACCENT}</span>
      </p>
    </section>
  );
}
