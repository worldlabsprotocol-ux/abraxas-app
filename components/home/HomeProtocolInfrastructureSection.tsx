// FILE: components/home/HomeProtocolInfrastructureSection.tsx

import Link from "next/link";
import {
  PROTOCOL_FLOW_STAGES,
  PROTOCOL_FLOW_TAGLINE,
  PROTOCOL_GUARANTEES,
} from "@/lib/home/protocolPositioningCopy";

export function HomeProtocolInfrastructureSection() {
  return (
    <section
      id="protocol-infrastructure"
      className="abx-home-protocol"
      aria-labelledby="home-protocol-heading"
    >
      <header className="abx-home-protocol__header">
        <p className="abx-v2-eyebrow">Protocol flow</p>
        <h2 id="home-protocol-heading" className="abx-v2-section-title">
          Independent trust and verification infrastructure
        </h2>
        <p className="abx-v2-section-lead">{PROTOCOL_FLOW_TAGLINE}</p>
      </header>

      <ol className="abx-home-protocol__flow" aria-label="Abraxas protocol sequence">
        {PROTOCOL_FLOW_STAGES.map((stage, index) => (
          <li key={stage.id} className="abx-home-protocol__flow-step">
            <span className="abx-home-protocol__flow-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="abx-home-protocol__flow-label">{stage.label}</h3>
              <p className="abx-home-protocol__flow-summary">{stage.summary}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="abx-home-protocol__guarantees" aria-label="Core guarantees">
        {PROTOCOL_GUARANTEES.map((item) => (
          <article key={item.id} className="abx-home-protocol__guarantee">
            <h3 className="abx-home-protocol__guarantee-title">{item.title}</h3>
            <p className="abx-home-protocol__guarantee-body">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="abx-home-protocol__actions">
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--primary" href="#start-sandbox">
          Start sandbox
        </Link>
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--secondary" href="/developers">
          Developer documentation
        </Link>
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--secondary" href="/verification">
          Independent verifier
        </Link>
      </div>
    </section>
  );
}
