"use client";
import React, { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface MineralVertical {
  id: string;
  name: string;
  symbol: string;
  priceLabel: string;
  pricePerUnit: number;
  unit: string;
  status: "active" | "pipeline" | "future";
  ltv: number;
  abraFee: number;
  yr1Revenue: string;
  edge: string;
  usPct: number; // % of US reserves near tribal land
  color: string;
  bgColor: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────
const MINERALS: MineralVertical[] = [
  {
    id: "oil",
    name: "Oil & Gas",
    symbol: "OIL",
    priceLabel: "$72/bbl",
    pricePerUnit: 72,
    unit: "barrel",
    status: "active",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "~$590K NOI",
    edge: "Post-discovery entry. Confirmed reserves. BIA lease secured.",
    usPct: 0,
    color: "#0D7377",
    bgColor: "rgba(13,115,119,0.08)",
  },
  {
    id: "lithium",
    name: "Lithium",
    symbol: "LI",
    priceLabel: "$13,500/t",
    pricePerUnit: 13500,
    unit: "tonne",
    status: "pipeline",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "Yr2 online",
    edge: "79% of US lithium reserves within 35 mi of tribal land.",
    usPct: 79,
    color: "#7C3AED",
    bgColor: "rgba(124,58,237,0.08)",
  },
  {
    id: "copper",
    name: "Copper",
    symbol: "CU",
    priceLabel: "$9,800/t",
    pricePerUnit: 9800,
    unit: "tonne",
    status: "pipeline",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "Yr2 online",
    edge: "89% of US copper reserves within 35 mi of tribal land.",
    usPct: 89,
    color: "#D97706",
    bgColor: "rgba(217,119,6,0.08)",
  },
  {
    id: "nickel",
    name: "Nickel",
    symbol: "NI",
    priceLabel: "$16,000/t",
    pricePerUnit: 16000,
    unit: "tonne",
    status: "future",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "Yr3 online",
    edge: "97% of US nickel reserves within 35 mi of tribal land.",
    usPct: 97,
    color: "#059669",
    bgColor: "rgba(5,150,105,0.08)",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    symbol: "CO",
    priceLabel: "$28,000/t",
    pricePerUnit: 28000,
    unit: "tonne",
    status: "future",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "Yr3 online",
    edge: "68% of US cobalt reserves within 35 mi of tribal land.",
    usPct: 68,
    color: "#DC2626",
    bgColor: "rgba(220,38,38,0.08)",
  },
  {
    id: "potash",
    name: "Potash",
    symbol: "K",
    priceLabel: "$310/t",
    pricePerUnit: 310,
    unit: "tonne",
    status: "future",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "Yr4 online",
    edge: "US critical mineral (Nov 2025). Federal support likely.",
    usPct: 0,
    color: "#16A34A",
    bgColor: "rgba(22,163,74,0.08)",
  },
  {
    id: "ree",
    name: "Rare Earth / NdPr",
    symbol: "REE",
    priceLabel: "$68,000/t",
    pricePerUnit: 68000,
    unit: "tonne",
    status: "future",
    ltv: 55,
    abraFee: 500,
    yr1Revenue: "Yr4 online",
    edge: "DoD actively seeking domestic US sources. EV + wind structural demand.",
    usPct: 0,
    color: "#0F3460",
    bgColor: "rgba(15,52,96,0.08)",
  },
];

const STATUS_LABEL: Record<string, string> = {
  active: "● ACTIVE",
  pipeline: "◎ PIPELINE",
  future: "○ FUTURE",
};
const STATUS_COLOR: Record<string, string> = {
  active: "#10B981",
  pipeline: "#F59E0B",
  future: "#6B7280",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function MineralRightsPanel() {
  const [selected, setSelected] = useState<string>("oil");
  const mineral = MINERALS.find((m) => m.id === selected)!;

  return (
    <div style={{
      background: "#0A0C10",
      border: "1px solid #1E293B",
      borderRadius: 12,
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #1E293B",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "#10B981", fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
            ABRAXAS PROTOCOL · MINERAL RIGHTS VERTICAL
          </div>
          <div style={{ color: "#F1F5F9", fontSize: 15, fontWeight: 700 }}>
            Energy & Critical Minerals
          </div>
        </div>
        <div style={{
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 6,
          padding: "4px 10px",
          color: "#10B981",
          fontSize: 10,
          letterSpacing: 1,
        }}>
          AAS-STANDARD · 55% LTV
        </div>
      </div>

      {/* Mineral Selector Tabs */}
      <div style={{
        display: "flex",
        overflowX: "auto",
        borderBottom: "1px solid #1E293B",
        padding: "0 8px",
        gap: 4,
      }}>
        {MINERALS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            style={{
              background: selected === m.id ? m.bgColor : "transparent",
              border: "none",
              borderBottom: selected === m.id ? `2px solid ${m.color}` : "2px solid transparent",
              color: selected === m.id ? m.color : "#64748B",
              padding: "10px 14px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {m.symbol}
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ color: "#F1F5F9", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              {mineral.name}
            </div>
            <div style={{ color: mineral.color, fontSize: 13, fontWeight: 700 }}>
              {mineral.priceLabel}
            </div>
          </div>
          <div style={{
            color: STATUS_COLOR[mineral.status],
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            paddingTop: 4,
          }}>
            {STATUS_LABEL[mineral.status]}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "LTV", value: `${mineral.ltv}%` },
            { label: "ABRA FEE", value: `${mineral.abraFee.toLocaleString()} $ABRA` },
            { label: "YR1 REVENUE", value: mineral.yr1Revenue },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "#0F172A",
              border: "1px solid #1E293B",
              borderRadius: 8,
              padding: "10px 12px",
            }}>
              <div style={{ color: "#475569", fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
              <div style={{ color: "#F1F5F9", fontSize: 12, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Edge */}
        <div style={{
          background: mineral.bgColor,
          border: `1px solid ${mineral.color}33`,
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 14,
        }}>
          <div style={{ color: "#94A3B8", fontSize: 9, letterSpacing: 1.5, marginBottom: 6 }}>TRIBAL EDGE</div>
          <div style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 1.6 }}>{mineral.edge}</div>
        </div>

        {/* US Tribal Reserve Bar */}
        {mineral.usPct > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ color: "#64748B", fontSize: 9, letterSpacing: 1.5 }}>
                US RESERVES WITHIN 35MI OF TRIBAL LAND
              </div>
              <div style={{ color: mineral.color, fontSize: 11, fontWeight: 700 }}>{mineral.usPct}%</div>
            </div>
            <div style={{ background: "#1E293B", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${mineral.usPct}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${mineral.color}88, ${mineral.color})`,
                borderRadius: 4,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}

        {/* Pipeline note */}
        <div style={{
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: 8,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{ color: "#10B981", fontSize: 16 }}>◈</div>
          <div style={{ color: "#64748B", fontSize: 11, lineHeight: 1.5 }}>
            All mineral assets processed through the{" "}
            <span style={{ color: "#10B981" }}>7-stage AAS verification pipeline</span>.
            Certificate minted on Solana · Collateral via Loopscale · 500 $ABRA fee.
          </div>
        </div>
      </div>
    </div>
  );
}
