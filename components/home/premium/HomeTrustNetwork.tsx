"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const NODES = [
  { id: "holder", label: "Holder", x: 12, y: 50 },
  { id: "abraxas", label: "Abraxas", x: 38, y: 50 },
  { id: "app-a", label: "Simulated app A", x: 64, y: 28 },
  { id: "app-b", label: "Simulated app B", x: 64, y: 72 },
  { id: "verifier", label: "Independent verifier", x: 88, y: 50 },
] as const;

type NodeId = (typeof NODES)[number]["id"];

const EDGES: { from: NodeId; to: NodeId; id: string }[] = [
  { from: "holder", to: "abraxas", id: "consent" },
  { from: "abraxas", to: "app-a", id: "receipt-a" },
  { from: "abraxas", to: "app-b", id: "receipt-b" },
  { from: "abraxas", to: "verifier", id: "verify" },
];

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

  return (
    <div className="abx-premium-network">
      <p className="abx-v2-eyebrow">Trust network</p>
      <h2 id="home-network-heading" className="abx-v2-section-title">
        Applications consume scoped decisions
      </h2>
      <p className="abx-v2-section-lead">
        Receipts move to relying parties and independent verifiers. Raw evidence does not follow the same paths.
        Diagram uses labeled simulated apps — not live partner topology.
      </p>

      <div className="abx-premium-network__stage">
        <svg
          className="abx-premium-network__svg"
          viewBox="0 0 100 100"
          role="img"
          aria-labelledby="home-network-heading"
        >
          <title>Simulated trust decision flow between holder, Abraxas, apps, and verifiers</title>
          {EDGES.map((e) => {
            const from = NODES.find((n) => n.id === e.from)!;
            const to = NODES.find((n) => n.id === e.to)!;
            const lit = highlightEdge(e.id);
            return (
              <motion.path
                key={e.id}
                d={edgePath(from, to)}
                fill="none"
                stroke={lit ? "rgba(76, 187, 146, 0.85)" : "rgba(255,255,255,0.12)"}
                strokeWidth={lit ? 0.55 : 0.35}
                initial={false}
                animate={{ opacity: lit ? 1 : 0.45 }}
                transition={{ duration: reduceMotion ? 0 : 0.35 }}
              />
            );
          })}
          {NODES.map((node) => {
            const selected = node.id === active;
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={selected ? 3.2 : 2.6}
                  fill={selected ? "#4CBB92" : "#11161a"}
                  stroke={selected ? "#4CBB92" : "rgba(255,255,255,0.25)"}
                  strokeWidth={0.4}
                />
                <text
                  x={node.x}
                  y={node.y + (node.y < 50 ? -4.5 : 5.5)}
                  textAnchor="middle"
                  className="abx-premium-network__node-label"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="abx-premium-network__picker" role="listbox" aria-label="Highlight network path">
          {NODES.map((node) => (
            <button
              key={node.id}
              type="button"
              role="option"
              aria-selected={active === node.id}
              className={`abx-premium-network__pick${active === node.id ? " abx-premium-network__pick--active" : ""}`}
              onClick={() => setActive(node.id)}
            >
              {node.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
