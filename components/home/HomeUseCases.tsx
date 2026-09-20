"use client";
// FILE: components/home/HomeUseCases.tsx
// Real ecosystem use cases. Planned vs available from the network capability registry.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { COMMAND_CENTER_USE_CASES } from "@/lib/home/commandCenter";

const FONT = ABRAXAS_FONT_SANS;

export function HomeUseCases() {
  return (
    <section aria-labelledby="use-cases-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2 id="use-cases-heading" className="abx-home-section-title">Where private eligibility is used</h2>
      <p className="abx-home-section-lead">
        These are Abraxas capabilities, not implied partnerships. Availability is labeled from the protocol registry.
      </p>
      <ul className="abx-use-case-grid" aria-label="Ecosystem use cases">
        {COMMAND_CENTER_USE_CASES.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="abx-use-case-card" aria-label={`${item.title}. ${item.availabilityLabel}. ${item.summary}`}>
              <span className={`abx-use-case-status is-${item.availability}`}>
                {item.availabilityLabel}
              </span>
              <span className="abx-use-case-title">{item.title}</span>
              <span className="abx-use-case-body">{item.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
      <style>{`
        .abx-use-case-grid {
          list-style: none; margin: 0; padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
          gap: 0.75rem;
          text-align: left;
        }
        .abx-use-case-card {
          display: flex; flex-direction: column; gap: 0.4rem;
          min-height: 9rem;
          padding: 1rem;
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          background: rgba(14,16,28,0.86);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .abx-use-case-card:hover, .abx-use-case-card:focus-visible {
          border-color: rgba(99,102,241,0.55);
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
        .abx-use-case-status {
          align-self: flex-start;
          font-family: ${FONT};
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0.22rem 0.45rem;
          border-radius: 999px;
        }
        .abx-use-case-status.is-available { color: #04110f; background: #2DD4BF; }
        .abx-use-case-status.is-planned { color: #1b1404; background: #E8C547; }
        .abx-use-case-title { font-family: ${FONT}; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
        .abx-use-case-body { font-family: ${FONT}; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); }
      `}</style>
    </section>
  );
}
