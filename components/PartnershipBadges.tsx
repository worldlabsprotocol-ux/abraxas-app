"use client";
import React, { useState } from "react";

interface Partner {
  id: string;
  name: string;
  role: string;
  tagline: string;
  stat: string;
  statLabel: string;
  detail: string;
  color: string;
  dot: string;
}

const PARTNERS: Partner[] = [
  {
    id: "utila",
    name: "Utila",
    role: "Infrastructure",
    tagline: "Institutional MPC Custody",
    stat: "$40M",
    statLabel: "raised",
    detail:
      "Institutional-grade MPC wallet infrastructure. Split-key security — no single point of failure. Every $ABRA distribution is policy-governed, insured, and auditable on Solana. Backed by Red Dot Capital, Nyca, Wing VC, DCG.",
    color: "#0D7377",
    dot: "#10B981",
  },
  {
    id: "cv5",
    name: "CV5 Capital",
    role: "Institutional",
    tagline: "CIMA-Regulated Fund Platform",
    stat: "$950M+",
    statLabel: "AUA · 49+ funds",
    detail:
      "CIMA-regulated Cayman fund formation and operations. Wraps Abraxas mineral deals in a regulated structure accessible to global institutional LPs. 30+ years TradFi + digital asset expertise. Reg #1885380.",
    color: "#7C3AED",
    dot: "#A78BFA",
  },
];

export default function PartnershipBadges({ compact = false }: { compact?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PARTNERS.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#0F172A",
              border: `1px solid ${p.color}44`,
              borderRadius: 6,
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.dot }} />
            <span style={{ color: "#CBD5E1", fontSize: 11, fontWeight: 600 }}>{p.name}</span>
            <span style={{ color: "#475569", fontSize: 10 }}>{p.role}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{
        color: "#475569",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 2,
      }}>
        STRATEGIC PARTNERSHIPS
      </div>

      {PARTNERS.map((p) => (
        <div
          key={p.id}
          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
          style={{
            background: "#0A0C10",
            border: `1px solid ${expanded === p.id ? p.color + "66" : "#1E293B"}`,
            borderRadius: 10,
            padding: 16,
            cursor: "pointer",
            transition: "border-color 0.2s",
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.dot,
                boxShadow: `0 0 6px ${p.dot}`,
              }} />
              <div>
                <div style={{ color: "#F1F5F9", fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#475569", fontSize: 10, marginTop: 1 }}>{p.tagline}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: p.color, fontSize: 14, fontWeight: 800 }}>{p.stat}</div>
              <div style={{ color: "#475569", fontSize: 9, letterSpacing: 1 }}>{p.statLabel}</div>
            </div>
          </div>

          {/* Expanded Detail */}
          {expanded === p.id && (
            <div style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${p.color}22`,
              color: "#94A3B8",
              fontSize: 11,
              lineHeight: 1.7,
            }}>
              {p.detail}
            </div>
          )}

          {/* Role badge */}
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            <div style={{
              background: `${p.color}15`,
              border: `1px solid ${p.color}33`,
              borderRadius: 4,
              padding: "3px 8px",
              color: p.color,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}>
              {p.role.toUpperCase()}
            </div>
            <div style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 4,
              padding: "3px 8px",
              color: "#10B981",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}>
              VERIFIED PARTNER
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
