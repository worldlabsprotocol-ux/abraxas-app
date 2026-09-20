"use client";
// FILE: components/home/HomeCapabilityMap.tsx
// Visual product map. Hrefs come from the command-center contract + public route manifest.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  COMMAND_CENTER_CARDS,
  COMMAND_CENTER_GROUPS,
  type CommandAudience,
} from "@/lib/home/commandCenter";

const FONT = ABRAXAS_FONT_SANS;
const TEAL = "#2DD4BF";

const GROUP_TONE: Record<CommandAudience, string> = {
  people: "rgba(45, 212, 191, 0.14)",
  partners: "rgba(129, 140, 248, 0.16)",
  protocol: "rgba(232, 197, 71, 0.12)",
};

export function HomeCapabilityMap() {
  return (
    <section
      id="capability-map"
      aria-labelledby="capability-map-heading"
      className="abx-home-section-center abx-command-map"
      style={{ width: "100%" }}
    >
      <h2 id="capability-map-heading" className="abx-home-section-title">
        What you can do here
      </h2>
      <p className="abx-home-section-lead">
        A capability map for people, partners, and protocol explorers. Every card opens a real Abraxas surface.
      </p>
      <div className="abx-command-groups">
        {COMMAND_CENTER_GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`map-${group.id}`} className="abx-command-group">
            <h3 id={`map-${group.id}`} className="abx-command-group-title">
              <span aria-hidden="true" className="abx-command-group-dot" style={{ background: GROUP_TONE[group.id] }} />
              {group.title}
            </h3>
            <p className="abx-command-group-intro">{group.intro}</p>
            <ul className="abx-capability-grid" aria-label={group.title}>
              {COMMAND_CENTER_CARDS.filter((card) => card.group === group.id).map((card) => (
                <li key={card.id}>
                  <Link href={card.href} className="abx-capability-card" aria-label={`${card.title}. ${card.summary}`}>
                    <span className="abx-capability-card-title">{card.title}</span>
                    <span className="abx-capability-card-body">{card.summary}</span>
                    <span className="abx-capability-card-go" aria-hidden="true" style={{ color: TEAL }}>
                      Open →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <style>{`
        .abx-command-groups { display: grid; gap: 1.35rem; text-align: left; width: 100%; }
        .abx-command-group-title {
          font-family: ${FONT};
          font-size: 0.92rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.3rem;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .abx-command-group-dot { width: 10px; height: 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.18); }
        .abx-command-group-intro { margin: 0 0 0.7rem; font-family: ${FONT}; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; }
        .abx-capability-grid {
          list-style: none; margin: 0; padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
          gap: 0.7rem;
        }
        .abx-capability-card {
          display: flex; flex-direction: column; gap: 0.4rem;
          min-height: 8.5rem;
          padding: 1rem 1.05rem;
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          background: linear-gradient(180deg, rgba(18,22,36,0.92), rgba(10,12,20,0.88));
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 10px 28px rgba(0,0,0,0.22);
          outline: none;
        }
        .abx-capability-card:hover, .abx-capability-card:focus-visible {
          border-color: rgba(45,212,191,0.55);
          box-shadow: 0 0 0 2px rgba(45,212,191,0.22), 0 12px 30px rgba(0,0,0,0.28);
        }
        .abx-capability-card-title { font-family: ${FONT}; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
        .abx-capability-card-body { font-family: ${FONT}; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); flex: 1; }
        .abx-capability-card-go { font-family: ${FONT}; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; }
        @media (prefers-reduced-motion: reduce) {
          .abx-capability-card { box-shadow: none; }
        }
      `}</style>
    </section>
  );
}
