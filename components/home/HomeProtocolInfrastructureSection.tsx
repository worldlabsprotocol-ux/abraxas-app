// FILE: components/home/HomeProtocolInfrastructureSection.tsx

import Link from "next/link";
import { HomeAbraxasSystemArchitectureDiagram } from "@/components/home/HomeAbraxasSystemArchitectureDiagram";
import {
  PROTOCOL_DEVELOPER_INTEGRATION_STEPS,
  PROTOCOL_FLOW_STAGES,
  PROTOCOL_PUBLIC_PILLARS,
  PROTOCOL_SECTION_CONSOLIDATED_GUARANTEE,
  PROTOCOL_SECTION_EYEBROW,
  PROTOCOL_SECTION_TITLE,
} from "@/lib/home/protocolPositioningCopy";

export function HomeProtocolInfrastructureSection() {
  return (
    <section
      id="protocol-infrastructure"
      className="abx-home-protocol"
      aria-labelledby="home-protocol-heading"
    >
      <div className="abx-home-protocol__card">
        <header className="abx-home-protocol__header abx-home-protocol__header--in-card">
          <p className="abx-v2-eyebrow">{PROTOCOL_SECTION_EYEBROW}</p>
          <h2 id="home-protocol-heading" className="abx-home-protocol__title">
            {PROTOCOL_SECTION_TITLE}
          </h2>
        </header>

        <ol className="abx-home-protocol__pillars" aria-label="Abraxas protocol in three steps">
          {PROTOCOL_PUBLIC_PILLARS.map((pillar) => (
            <li key={pillar.id} className="abx-home-protocol__pillar">
              <h3 className="abx-home-protocol__pillar-label">{pillar.label}</h3>
              <p className="abx-home-protocol__pillar-summary">{pillar.summary}</p>
            </li>
          ))}
        </ol>

        <p className="abx-home-protocol__consolidated">{PROTOCOL_SECTION_CONSOLIDATED_GUARANTEE}</p>
      </div>

      <details className="abx-home-protocol__disclosure">
        <summary>Full protocol sequence</summary>
        <ol className="abx-home-protocol__flow abx-home-protocol__flow--compact" aria-label="Five stage protocol sequence">
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
      </details>

      <details className="abx-home-protocol__disclosure">
        <summary>Technical architecture</summary>
        <HomeAbraxasSystemArchitectureDiagram />
      </details>

      <details className="abx-home-protocol__disclosure">
        <summary>Developer integration path</summary>
        <ol className="abx-home-protocol__integration-steps">
          {PROTOCOL_DEVELOPER_INTEGRATION_STEPS.map((step, index) => (
            <li key={step}>
              <span className="abx-home-protocol__flow-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </details>

      <nav className="abx-home-protocol__resources" aria-label="Developer resources">
        <Link className="abx-home-protocol__resource-link" href="/developers">
          Developer documentation
        </Link>
        <Link className="abx-home-protocol__resource-link" href="/verification">
          Independent verifier
        </Link>
      </nav>
    </section>
  );
}
