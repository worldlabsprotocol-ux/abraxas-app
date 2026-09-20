"use client";
// FILE: components/home/HomeProtocolMap.tsx
// How Abraxas works — holder to server-verified partner action. No execution claims.

import { useId, useState } from "react";
import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { COMMAND_CENTER_PROTOCOL_STAGES } from "@/lib/home/commandCenter";

const FONT = ABRAXAS_FONT_SANS;

export function HomeProtocolMap() {
  const baseId = useId();
  const [openId, setOpenId] = useState(COMMAND_CENTER_PROTOCOL_STAGES[0]?.id ?? "holder");

  return (
    <section
      aria-labelledby="protocol-map-heading"
      className="abx-home-section-center abx-protocol-map"
      style={{ width: "100%" }}
    >
      <h2 id="protocol-map-heading" className="abx-home-section-title">
        How Abraxas works
      </h2>
      <p className="abx-home-section-lead">
        Holder → private policy result → fresh consent → partner-bound receipt → server-verified protocol action.
        Abraxas does not execute the partner action.
      </p>
      <ol className="abx-protocol-steps" aria-label="How Abraxas works">
        {COMMAND_CENTER_PROTOCOL_STAGES.map((stage, index) => {
          const expanded = openId === stage.id;
          const panelId = `${baseId}-${stage.id}`;
          return (
            <li key={stage.id} className={expanded ? "is-open" : undefined}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenId(stage.id)}
                className="abx-protocol-step-trigger"
              >
                <span className="abx-protocol-index" aria-hidden="true">{index + 1}</span>
                <span>{stage.title}</span>
              </button>
              <div id={panelId} hidden={!expanded} className="abx-protocol-panel">
                <p>{stage.body}</p>
                <Link href={stage.href}>{stage.linkLabel} →</Link>
              </div>
            </li>
          );
        })}
      </ol>
      <style>{`
        .abx-protocol-steps {
          list-style: none; margin: 0; padding: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.55rem;
          text-align: left;
        }
        .abx-protocol-step-trigger {
          width: 100%;
          display: flex; align-items: center; gap: 0.65rem;
          padding: 0.75rem 0.85rem;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(12,14,24,0.7);
          color: var(--text-primary);
          font-family: ${FONT};
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
        }
        .abx-protocol-step-trigger:focus-visible,
        .abx-protocol-steps li.is-open .abx-protocol-step-trigger {
          border-color: rgba(45,212,191,0.55);
          box-shadow: 0 0 0 2px rgba(45,212,191,0.2);
        }
        .abx-protocol-index {
          width: 1.55rem; height: 1.55rem; border-radius: 999px;
          display: grid; place-items: center;
          background: linear-gradient(135deg, #2DD4BF, #6366F1);
          color: #04110f;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .abx-protocol-panel {
          padding: 0.65rem 0.9rem 0.85rem 3.05rem;
          font-family: ${FONT};
          font-size: 0.82rem;
          line-height: 1.55;
          color: var(--text-secondary);
        }
        .abx-protocol-panel a { color: #2DD4BF; font-weight: 700; text-decoration: none; }
        .abx-protocol-panel a:focus-visible { outline: 2px solid #2DD4BF; outline-offset: 3px; }
        @media (min-width: 820px) {
          .abx-protocol-steps { grid-template-columns: repeat(5, minmax(0, 1fr)); align-items: start; }
          .abx-protocol-panel { padding-left: 0.85rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .abx-protocol-step-trigger { box-shadow: none; }
        }
      `}</style>
    </section>
  );
}
