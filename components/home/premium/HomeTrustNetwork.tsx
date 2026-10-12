"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const NODES = [
  { id: "holder", label: "Holder", short: "You", x: 12, y: 50 },
  { id: "abraxas", label: "Abraxas", short: "Abraxas", x: 38, y: 50 },
  { id: "app-a", label: "Simulated app A", short: "App A", x: 64, y: 28 },
  { id: "app-b", label: "Simulated app B", short: "App B", x: 64, y: 72 },
  { id: "verifier", label: "Independent verifier", short: "Verifier", x: 88, y: 50 },
] as const;

type NodeId = (typeof NODES)[number]["id"];

const EDGES: { from: NodeId; to: NodeId; id: string; label: string }[] = [
  { from: "holder", to: "abraxas", id: "consent", label: "Consent to verify" },
  { from: "abraxas", to: "app-a", id: "receipt-a", label: "Scoped receipt to app A" },
  { from: "abraxas", to: "app-b", id: "receipt-b", label: "Scoped receipt to app B" },
  { from: "abraxas", to: "verifier", id: "verify", label: "Signature check" },
];

const NODE_COPY: Record<NodeId, string> = {
  holder: "You approve sharing a narrow answer — not your full identity file.",
  abraxas: "Abraxas evaluates policy and signs a decision receipt. Evidence stays protected.",
  "app-a": "Simulated retail app receives only the eligibility answer its policy allows.",
  "app-b": "Simulated venue app uses a different policy — outcomes are not interchangeable.",
  verifier: "Anyone can verify the receipt signature and freshness without receiving private evidence.",
};

function edgePath(from: (typeof NODES)[number], to: (typeof NODES)[number]): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/** Signature B — trust consumption network (labeled simulation). */
export function HomeTrustNetwork() {
  const [active, setActive] = useState<NodeId>("abraxas");
  const reduceMotion = useReducedMotion();

  const highlightEdge = useCallback(
    (edgeId: string) => {
      if (active === "app-a") return edgeId === "receipt-a" || edgeId === "consent";
      if (active === "app-b") return edgeId === "receipt-b" || edgeId === "consent";
      if (active === "verifier") return edgeId === "verify";
      if (active === "holder") return edgeId === "consent";
      return true;
    },
    [active],
  );

  const activePaths = useMemo(
    () => EDGES.filter((e) => highlightEdge(e.id)).map((e) => e.label),
    [highlightEdge],
  );

  return (
    <div className="abx-premium-network">
      <p className="abx-v2-eyebrow">Trust network</p>
      <h2 id="home-network-heading" className="abx-v2-section-title">
        Applications consume scoped decisions
      </h2>
      <p className="abx-v2-section-lead">
        Receipts can reach apps and independent checkers. Your raw documents do not travel on the same paths. This diagram
        uses simulated apps — not a live partner map.
      </p>

      <div className="abx-premium-network__stage abx-premium-surface-open">
        <div className="abx-premium-network__diagram" aria-hidden="true">
          <svg className="abx-premium-network__svg" viewBox="0 0 100 100" focusable="false">
            {EDGES.map((e) => {
              const from = NODES.find((n) => n.id === e.from)!;
              const to = NODES.find((n) => n.id === e.to)!;
              const lit = highlightEdge(e.id);
              return (
                <motion.path
                  key={e.id}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={lit ? "rgba(76, 187, 146, 0.85)" : "rgba(255, 255, 255, 0.1)"}
                  strokeWidth={lit ? 0.55 : 0.35}
                  initial={false}
                  animate={{ opacity: lit ? 1 : 0.35 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35 }}
                />
              );
            })}
            {NODES.map((node) => {
              const selected = node.id === active;
              return (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={selected ? 3.2 : 2.6}
                  fill={selected ? "#4CBB92" : "#11161a"}
                  stroke={selected ? "#4CBB92" : "rgba(255, 255, 255, 0.25)"}
                  strokeWidth={0.4}
                />
              );
            })}
          </svg>
          <div className="abx-premium-network__html-labels">
            {NODES.map((node) => (
              <span
                key={node.id}
                className={`abx-premium-network__html-label${node.id === active ? " abx-premium-network__html-label--active" : ""}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {node.short}
              </span>
            ))}
          </div>
        </div>

        <div
          className="abx-premium-network__controls"
          role="radiogroup"
          aria-labelledby="home-network-heading"
        >
          <p className="abx-premium-network__controls-title" id="home-network-nodes-label">
            Select a role in the flow
          </p>
          {NODES.map((node) => (
            <button
              key={node.id}
              type="button"
              role="radio"
              aria-checked={active === node.id}
              className={`abx-premium-network__pick${active === node.id ? " abx-premium-network__pick--active" : ""}`}
              onClick={() => setActive(node.id)}
            >
              <span className="abx-premium-network__pick-label">{node.label}</span>
            </button>
          ))}
        </div>

        <div className="abx-premium-network__detail" aria-live="polite">
          <p className="abx-premium-network__detail-body">{NODE_COPY[active]}</p>
          {activePaths.length > 0 ? (
            <ul className="abx-premium-network__detail-paths">
              {activePaths.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
