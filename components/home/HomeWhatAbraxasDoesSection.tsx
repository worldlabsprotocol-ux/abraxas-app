"use client";
// FILE: components/home/HomeWhatAbraxasDoesSection.tsx

import Link from "next/link";
import {
  HOMEPAGE_PROTOCOL_FLOW_STAGES,
  HOMEPAGE_WHAT_CLOSER,
  HOMEPAGE_WHAT_CLOSER_ACCENT,
  HOMEPAGE_WHAT_HEADING,
  HOMEPAGE_WHAT_LEAD,
  HOMEPAGE_WHAT_PRINCIPLES,
} from "@/lib/home/homepageTrustArchitectureCopy";
import { ProtocolStageIcon } from "@/components/home/trust-arch/HomeTrustArchitectureIcons";

export function HomeWhatAbraxasDoesSection() {
  return (
    <section id="what-abraxas-does" className="abx-home-trust-arch abx-home-trust-arch--what" aria-labelledby="home-what-heading">
      <h2 id="home-what-heading" className="abx-v2-section-title">
        {HOMEPAGE_WHAT_HEADING}
      </h2>
      <p className="abx-v2-section-lead abx-v2-section-lead--tight">{HOMEPAGE_WHAT_LEAD}</p>
      <div className="abx-home-trust-arch__accent-rule" aria-hidden="true" />

      <ol className="abx-home-protocol-flow" aria-label="Protocol stages">
        {HOMEPAGE_PROTOCOL_FLOW_STAGES.map((stage, index) => (
          <li key={stage.id} className="abx-home-protocol-flow__stage">
            {index > 0 ? <span className="abx-home-protocol-flow__connector" aria-hidden="true" /> : null}
            <article className="abx-home-protocol-flow__card">
              <div className="abx-home-protocol-flow__icon-wrap">
                <ProtocolStageIcon stage={stage.id} />
              </div>
              <h3 className="abx-home-protocol-flow__title">{stage.title}</h3>
              <p className="abx-home-protocol-flow__summary">{stage.summary}</p>
            </article>
          </li>
        ))}
      </ol>

      <ul className="abx-home-trust-principles">
        {HOMEPAGE_WHAT_PRINCIPLES.map((row) => (
          <li key={row.emphasis}>
            The <strong className="abx-home-trust-principles__emph">{row.emphasis}</strong> {row.text}
          </li>
        ))}
      </ul>

      <p className="abx-home-trust-arch__closer">
        {HOMEPAGE_WHAT_CLOSER}{" "}
        <span className="abx-home-trust-arch__closer-accent">{HOMEPAGE_WHAT_CLOSER_ACCENT}</span>
      </p>

      <p className="abx-home-trust-arch__nav-hint">
        Integrating?{" "}
        <Link href="/integrate" className="abx-home-trust-arch__link">
          Open Integration Studio
        </Link>
        {" · "}
        <Link href="/docs" className="abx-home-trust-arch__link">
          Read the docs
        </Link>
      </p>
    </section>
  );
}
