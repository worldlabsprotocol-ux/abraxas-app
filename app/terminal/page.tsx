"use client";

import { type ReactNode, useState } from "react";
import { FlagshipAssetPage } from "@/components/assets/FlagshipAssetPage";
import { AssetOwnerOnboarding } from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack } from "@/components/onboarding/TrustStack";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const BG = "#0A0C10";
const CARD = "#0D1117";
const BDR = "#1C2333";
const G = "#10B981";
const A = "#F59E0B";
const B = "#3B82F6";
const W = "#F8FAFC";
const P = "#8B5CF6";

type Tab = "terminal" | "lending";
type Deep = "main" | "asset" | "registry" | "submit" | "trust";
type TierId = "starter" | "growth" | "enterprise";

interface ScenarioData {
  color: string;
  label: string;
  assets: number[];
  aum: number[];
  rev: number[];
  ebitda: number[];
  ebitdaMargin: number[];
  grossMargin: number[];
}

interface BarDataPoint {
  label: string;
  [key: string]: number | string;
}

const SMALL: ScenarioData = {
  color: A,
  label: "Small ($1-3M avg)",
  assets: [75, 250, 500],
  aum: [112.5, 595.6, 1786.1],
  rev: [1.33, 7.12, 21.43],
  ebitda: [-5.19, -6.87, -3.2],
  ebitdaMargin: [-389.1, -96.5, -14.9],
  grossMargin: [-87.5, 6.8, 44.2],
};

const LARGE: ScenarioData = {
  color: G,
  label: "Large ($15-25M avg)",
  assets: [25, 75, 150],
  aum: [375, 1818.8, 5386.9],
  rev: [4.57, 22.64, 67.04],
  ebitda: [-0.21, 13.18, 49.95],
  ebitdaMargin: [-4.6, 58.2, 74.5],
  grossMargin: [74.8, 87.6, 91.8],
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function BarSVG({
  data,
  keys,
  colors,
  height = 180,
}: {
  data: BarDataPoint[];
  keys: string[];
  colors: string[];
  height?: number;
}) {
  const width = 520;
  const pad = { top: 10, right: 8, bottom: 36, left: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const values = data.flatMap((d) =>
    keys.map((k) => {
      const v = d[k];
      return typeof v === "number" ? v : 0;
    }),
  );

  const maxV = Math.max(...values, 0);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;
  const groupW = chartW / data.length;
  const barW = Math.min((groupW / keys.length) * 0.78, 32);
  const groupOffset = (groupW - barW * keys.length) / 2;
  const yScale = (v: number) => pad.top + chartH - ((v - minV) / range) * chartH;
  const zeroY = yScale(0);
  const ticks = [minV, minV + range / 4, minV + range / 2, minV + (range * 3) / 4, maxV].map(
    (t) => Math.round(t * 10) / 10,
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="EBITDA bar chart"
      role="img"
    >
      <rect x="0" y="0" width={width} height={height} fill="transparent" />

      {ticks.map((t, i) => {
        const y = yScale(t);
        return (
          <g key={`tick-${i}`}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left - 8}
              y={y + 4}
              fill="rgba(255,255,255,0.45)"
              fontFamily={M}
              fontSize="10"
              textAnchor="end"
            >
              {t >= 0 ? `$${t.toFixed(0)}M` : `($${Math.abs(t).toFixed(0)}M)`}
            </text>
          </g>
        );
      })}

      {minV < 0 && (
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(255,255,255,0.3)"
        />
      )}

      {data.map((d, groupIndex) => (
        <g key={String(d.label)}>
          {keys.map((k, keyIndex) => {
            const raw = d[k];
            const value = typeof raw === "number" ? raw : 0;
            const x = pad.left + groupIndex * groupW + groupOffset + keyIndex * barW;
            const y = value >= 0 ? yScale(value) : zeroY;
            const h = Math.max(Math.abs(yScale(value) - zeroY), 1);

            return (
              <rect
                key={`${String(d.label)}-${k}`}
                x={x}
                y={y}
                width={barW - 6}
                height={h}
                rx={4}
                fill={colors[keyIndex] ?? G}
              />
            );
          })}

          <text
            x={pad.left + groupIndex * groupW + groupW / 2}
            y={height - 12}
            fill="rgba(255,255,255,0.55)"
            fontFamily={M}
            fontSize="10"
            textAnchor="middle"
          >
            {String(d.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ width: 4, height: 14, background: G, borderRadius: 999 }} />
      <div
        style={{
          fontFamily: M,
          fontSize: "0.72rem",
          color: G,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, width: "100%", background: `linear-gradient(90deg, ${BDR}, transparent)` }} />;
}

function Section({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        border: `1px solid ${BDR}`,
        background: CARD,
        borderRadius: 10,
        padding: "clamp(1.1rem, 2vw, 1.5rem)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function RegistryInspector({ onOpenAsset }: { onOpenAsset: () => void }) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Section>
        <Label>Asset Registry</Label>
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            fontFamily: S,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          <div
            style={{
              border: `1px solid ${G}30`,
              background: `${G}08`,
              borderRadius: 8,
              padding: "1rem",
              display: "grid",
              gap: "0.4rem",
            }}
          >
            <div style={{ fontFamily: M, color: G, fontSize: "0.8rem", fontWeight: 700 }}>
              AAS-1 · VERIFIED
            </div>
            <div style={{ color: W, fontSize: "1.15rem", fontWeight: 700 }}>
              Cielo Sunrise — $1,100,000
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)" }}>
              Mineral Bluff, Georgia · 89/100 collateral score · 96% verification confidence
            </div>
            <button
              onClick={onOpenAsset}
              style={{
                marginTop: "0.75rem",
                width: "fit-content",
                padding: "0.72rem 1rem",
                borderRadius: 6,
                border: `1px solid ${G}40`,
                background: `${G}10`,
                color: G,
                fontFamily: M,
                fontSize: "0.82rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              Open asset →
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function LendingTab() {
  const stats = [
    { label: "Max LTV", value: "60%" },
    { label: "Stablecoin", value: "USDC" },
    { label: "Collateral", value: "Verified RWAs" },
    { label: "Eligibility", value: "AAS-1 Required" },
  ];

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <Section
        style={{
          background: `linear-gradient(180deg, ${CARD}, rgba(13,17,23,0.88))`,
        }}
      >
        <Label>Lending Engine</Label>
        <div style={{ display: "grid", gap: "1rem" }}>
          <h1
            style={{
              margin: 0,
              color: W,
              fontFamily: S,
              fontSize: "clamp(2rem, 4vw, 3.4rem)",
              lineHeight: 1.02,
              fontWeight: 800,
            }}
          >
            Collateral-backed USDC lending for verified real-world assets.
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 820,
              color: "rgba(255,255,255,0.68)",
              fontFamily: S,
              fontSize: "1.05rem",
              lineHeight: 1.65,
            }}
          >
            Verify your asset first. Once Abraxas issues an AAS-1 attestation, your asset becomes
            collateral-eligible for USDC lending with clear monitoring, capped LTV, and structured
            review.
          </p>
        </div>
      </Section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        {stats.map((stat) => (
          <Section key={stat.label}>
            <div style={{ fontFamily: M, color: "rgba(255,255,255,0.45)", fontSize: "0.76rem" }}>
              {stat.label}
            </div>
            <div
              style={{
                marginTop: "0.45rem",
                color: W,
                fontFamily: S,
                fontSize: "1.5rem",
                fontWeight: 800,
              }}
            >
              {stat.value}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

function DeepView({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <button
        onClick={onBack}
        style={{
          width: "fit-content",
          padding: "0.72rem 1rem",
          borderRadius: 6,
          border: `1px solid ${BDR}`,
          background: "transparent",
          color: "rgba(255,255,255,0.7)",
          fontFamily: M,
          fontSize: "0.82rem",
          fontWeight: 700,
          cursor: "pointer",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        ← Back to terminal
      </button>
      {children}
    </div>
  );
}

function TerminalTab() {
  const [deep, setDeep] = useState<Deep>("main");
  const [scenario, setScenario] = useState<"small" | "large">("large");
  const [selectedTier, setSelectedTier] = useState<TierId>("growth");

  const currentScenario = scenario === "small" ? SMALL : LARGE;

  const ebitdaData: BarDataPoint[] = [
    { label: "Year 1", small: -5.19, large: -0.21 },
    { label: "Year 2", small: -6.87, large: 13.18 },
    { label: "Year 3", small: -3.2, large: 49.95 },
  ];

  if (deep === "asset") {
    return (
      <DeepView onBack={() => setDeep("main")}>
        <FlagshipAssetPage />
      </DeepView>
    );
  }

  if (deep === "registry") {
    return (
      <DeepView onBack={() => setDeep("main")}>
        <RegistryInspector onOpenAsset={() => setDeep("asset")} />
      </DeepView>
    );
  }

  if (deep === "submit") {
    return (
      <DeepView onBack={() => setDeep("main")}>
        <AssetOwnerOnboarding onEnterTerminal={() => setDeep("main")} />
      </DeepView>
    );
  }

  if (deep === "trust") {
    return (
      <DeepView onBack={() => setDeep("main")}>
        <TrustStack />
      </DeepView>
    );
  }

  const tiers: Array<{
    id: TierId;
    tier: string;
    price: string;
    color: string;
    items: string[];
  }> = [
    {
      id: "starter",
      tier: "Starter",
      price: "$1,499",
      color: B,
      items: [
        "Wyoming LLC formation",
        "Operating agreement",
        "On-chain tokenization",
        "V5 basic verification",
      ],
    },
    {
      id: "growth",
      tier: "Growth",
      price: "$2,999",
      color: P,
      items: [
        "Everything in Starter",
        "Multi-sig governance",
        "Cap table management",
        "Lending eligibility",
      ],
    },
    {
      id: "enterprise",
      tier: "Enterprise",
      price: "$4,999",
      color: G,
      items: [
        "Everything in Growth",
        "Full compliance package",
        "Priority verification",
        "Dedicated verifier",
      ],
    },
  ];

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <Section
        style={{
          background: `radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 35%), ${CARD}`,
        }}
      >
        <Label>Abraxas Protocol · Solana</Label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.95fr)",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
            <h1
              style={{
                margin: 0,
                color: W,
                fontFamily: S,
                fontSize: "clamp(2.2rem, 5vw, 4.4rem)",
                lineHeight: 0.96,
                fontWeight: 800,
                maxWidth: 760,
              }}
            >
              Ownership infrastructure for real-world assets.
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "rgba(255,255,255,0.7)",
                fontFamily: S,
                fontSize: "1.06rem",
                lineHeight: 1.7,
              }}
            >
              Most projects tokenize first and verify never. Abraxas does the opposite — rigorous
              legal, custodial, and audit verification before anything is issued on-chain.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.65rem",
              }}
            >
              {[
                { label: "Legal Review", color: G },
                { label: "Custody Verified", color: G },
                { label: "Auditor Sign-Off", color: G },
                { label: "Reg A / D / CF Ready", color: B },
                { label: "On-Chain Attestation", color: B },
              ].map((tag) => (
                <div
                  key={tag.label}
                  style={{
                    padding: "0.45rem 0.7rem",
                    borderRadius: 999,
                    border: `1px solid ${tag.color}35`,
                    background: `${tag.color}10`,
                    color: tag.color,
                    fontFamily: M,
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  ✓ {tag.label}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem" }}>
              <button
                onClick={() => setDeep("submit")}
                style={{
                  padding: "0.95rem 1.5rem",
                  borderRadius: 6,
                  border: "none",
                  background: G,
                  color: "#000",
                  fontFamily: M,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Submit an asset →
              </button>

              <button
                onClick={() => setDeep("asset")}
                style={{
                  padding: "0.95rem 1.5rem",
                  borderRadius: 6,
                  border: `1px solid ${B}40`,
                  background: `${B}08`,
                  color: B,
                  fontFamily: M,
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                View genesis asset →
              </button>
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${BDR}`,
              borderRadius: 10,
              background: "#0B0F14",
              padding: "1rem",
              display: "grid",
              gap: "0.8rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                alignItems: "center",
              }}
            >
              <div style={{ fontFamily: M, color: G, fontSize: "0.78rem", fontWeight: 700 }}>
                COMMAND TERMINAL
              </div>
              <div style={{ fontFamily: M, color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
                V5 / ACTIVE
              </div>
            </div>

            <Divider />

            {[
              "Structured legal wrapper initialized",
              "Verification flow available for owner onboarding",
              "Collateral score generated after review",
              "Lending eligibility unlocked after AAS-1 attestation",
            ].map((line, index) => (
              <div
                key={line}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr",
                  gap: "0.75rem",
                  color: index < 2 ? W : "rgba(255,255,255,0.68)",
                  fontFamily: M,
                  fontSize: "0.82rem",
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.35)" }}>{`0${index + 1}`}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <Label>Wyoming LLC Formation</Label>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <h2
              style={{
                margin: 0,
                color: W,
                fontFamily: S,
                fontSize: "clamp(1.4rem, 2vw, 2rem)",
                fontWeight: 800,
              }}
            >
              Tokenize your business with a clean legal wrapper.
            </h2>
            <p
              style={{
                margin: "0.7rem 0 0",
                color: "rgba(255,255,255,0.65)",
                fontFamily: S,
                fontSize: "1rem",
                lineHeight: 1.7,
                maxWidth: 880,
              }}
            >
              Structure your business through a Wyoming LLC for full on-chain ownership,
              governance, fundraising, and lending inside the Abraxas protocol stack.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {tiers.map((pkg) => {
              const active = selectedTier === pkg.id;

              return (
                <div
                  key={pkg.id}
                  style={{
                    border: `1px solid ${active ? pkg.color : BDR}`,
                    background: active ? `${pkg.color}10` : "#0B0F14",
                    borderRadius: 8,
                    padding: "1rem",
                    display: "grid",
                    gap: "0.9rem",
                  }}
                >
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <div
                      style={{
                        fontFamily: M,
                        color: pkg.color,
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {pkg.tier}
                    </div>
                    <div style={{ color: W, fontFamily: S, fontSize: "1.9rem", fontWeight: 800 }}>
                      {pkg.price}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "0.55rem" }}>
                    {pkg.items.map((item) => (
                      <div
                        key={item}
                        style={{
                          display: "flex",
                          gap: "0.6rem",
                          alignItems: "flex-start",
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: S,
                          fontSize: "0.95rem",
                        }}
                      >
                        <span style={{ color: pkg.color }}>◉</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTier(pkg.id);
                      setDeep("submit");
                    }}
                    style={{
                      width: "100%",
                      padding: "0.82rem 1rem",
                      borderRadius: 6,
                      border: `1px solid ${pkg.color}55`,
                      background: `${pkg.color}18`,
                      color: pkg.color,
                      fontFamily: M,
                      fontSize: "0.9rem",
                      fontWeight: 900,
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Select {pkg.tier} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section>
        <Label>Protocol Architecture</Label>
        <div style={{ display: "grid", gap: "0.7rem", marginBottom: "1rem" }}>
          <h2
            style={{
              margin: 0,
              color: W,
              fontFamily: S,
              fontSize: "clamp(1.4rem, 2vw, 2rem)",
              fontWeight: 800,
            }}
          >
            Five layers. One protocol.
          </h2>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.65)",
              fontFamily: S,
              fontSize: "1rem",
              lineHeight: 1.7,
              maxWidth: 820,
            }}
          >
            Each layer compounds value. Assets flow up; ownership compounds across generations.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              n: "L5",
              title: "Reinvestment Engine",
              desc: "Compounding ownership across generations",
              color: G,
            },
            {
              n: "L4",
              title: "Cash Flow & Governance",
              desc: "Distributions and participation rights to token holders",
              color: G,
            },
            {
              n: "L3",
              title: "Community Distribution",
              desc: "Ownership accessible at meaningful price points",
              color: A,
            },
            {
              n: "L2",
              title: "Regulated Tokenization",
              desc: "Compliant digital securities under Reg A, D, CF",
              color: A,
            },
            {
              n: "L1",
              title: "Asset Origination",
              desc: "Real-world assets structured into investment vehicles",
              color: B,
            },
          ].map((layer) => (
            <div
              key={layer.n}
              style={{
                border: `1px solid ${BDR}`,
                background: "#0B0F14",
                borderRadius: 8,
                padding: "1rem",
                display: "grid",
                gap: "0.7rem",
              }}
            >
              <div
                style={{
                  width: "fit-content",
                  padding: "0.35rem 0.55rem",
                  borderRadius: 999,
                  background: `${layer.color}12`,
                  color: layer.color,
                  fontFamily: M,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                {layer.n}
              </div>
              <div style={{ color: W, fontFamily: S, fontSize: "1.05rem", fontWeight: 700 }}>
                {layer.title}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.62)",
                  fontFamily: S,
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                {layer.desc}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <Label>Platform Economics</Label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            marginBottom: "1.2rem",
          }}
        >
          {[
            { color: B, title: "Verification", rate: "0.50%", kind: "One-time" },
            { color: P, title: "Tokenization", rate: "0.25%", kind: "One-time" },
            { color: G, title: "Platform AUM", rate: "0.75%", kind: "Recurring" },
            { color: A, title: "Lending Spread", rate: "1.50%", kind: "Recurring" },
          ].map((row) => (
            <div
              key={row.title}
              style={{
                border: `1px solid ${BDR}`,
                background: "#0B0F14",
                borderRadius: 8,
                padding: "1rem",
                display: "grid",
                gap: "0.4rem",
              }}
            >
              <div style={{ color: row.color, fontFamily: M, fontSize: "0.76rem", fontWeight: 800 }}>
                {row.title}
              </div>
              <div style={{ color: W, fontFamily: S, fontSize: "1.7rem", fontWeight: 800 }}>
                {row.rate}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: S, fontSize: "0.92rem" }}>
                {row.kind}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem",
            marginBottom: "1rem",
          }}
        >
          {(["small", "large"] as const).map((key) => {
            const active = scenario === key;
            const color = key === "small" ? A : G;

            return (
              <button
                key={key}
                onClick={() => setScenario(key)}
                style={{
                  padding: "0.42rem 0.85rem",
                  borderRadius: 5,
                  cursor: "pointer",
                  border: `1px solid ${active ? color : BDR}`,
                  background: active ? `${color}12` : "#0B0F14",
                  color: active ? color : "rgba(255,255,255,0.4)",
                  fontFamily: M,
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {key === "small" ? "Small assets" : "Large assets"}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: `1px solid ${BDR}`,
              background: "#0B0F14",
              borderRadius: 8,
              padding: "1rem",
            }}
          >
            <div
              style={{
                marginBottom: "0.75rem",
                color: "rgba(255,255,255,0.72)",
                fontFamily: M,
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              EBITDA trajectory ($M)
            </div>
            <BarSVG data={ebitdaData} keys={["small", "large"]} colors={[A, G]} />
          </div>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            {[0, 1, 2].map((yearIndex) => {
              const ebitdaValue = currentScenario.ebitda[yearIndex];
              const ebitdaText =
                ebitdaValue < 0
                  ? `($${Math.abs(ebitdaValue).toFixed(1)}M)`
                  : `$${ebitdaValue.toFixed(1)}M`;

              return (
                <div
                  key={yearIndex}
                  style={{
                    border: `1px solid ${BDR}`,
                    background: "#0B0F14",
                    borderRadius: 8,
                    padding: "0.95rem 1rem",
                    display: "grid",
                    gap: "0.35rem",
                  }}
                >
                  <div style={{ color: "rgba(255,255,255,0.45)", fontFamily: M, fontSize: "0.72rem" }}>
                    YEAR {yearIndex + 1}
                  </div>
                  <div
                    style={{
                      color: ebitdaValue >= 0 ? G : A,
                      fontFamily: S,
                      fontSize: "1.35rem",
                      fontWeight: 800,
                    }}
                  >
                    {ebitdaText}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontFamily: S,
                      fontSize: "0.92rem",
                      lineHeight: 1.55,
                    }}
                  >
                    AUM: ${formatMoney(currentScenario.aum[yearIndex])}M · Rev: $
                    {currentScenario.rev[yearIndex].toFixed(1)}M · Margin:{" "}
                    {currentScenario.ebitdaMargin[yearIndex].toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section>
        <Label>Asset Verticals</Label>
        <div style={{ display: "grid", gap: "0.7rem", marginBottom: "1rem" }}>
          <h2
            style={{
              margin: 0,
              color: W,
              fontFamily: S,
              fontSize: "clamp(1.4rem, 2vw, 2rem)",
              fontWeight: 800,
            }}
          >
            One infrastructure. Many ownership categories.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              n: "01",
              color: A,
              badge: "Generational Sovereignty",
              title: "Tribal & Natural Resources",
              desc: "Direct participation in oil, gas, mineral, and renewable energy projects on indigenous and sovereign land.",
              tags: ["Mineral Rights", "Working Interests", "Carbon Credits", "Water Rights"],
            },
            {
              n: "02",
              color: B,
              badge: "Anti-Displacement",
              title: "Affordable Housing",
              desc: "Community land trusts and operator-managed properties tokenized so residents become fractional owners.",
              tags: ["CLT Structures", "Operator Properties", "Cash-Flow Residential"],
            },
            {
              n: "03",
              color: P,
              badge: "Cultural Equity",
              title: "Music & Creator Royalties",
              desc: "Artist catalogs, publishing rights, and future royalty streams structured as regulated securities.",
              tags: ["Master Recordings", "Publishing", "Sync Rights", "Catalog Funds"],
            },
          ].map((vertical) => (
            <div
              key={vertical.n}
              style={{
                border: `1px solid ${BDR}`,
                background: "#0B0F14",
                borderRadius: 8,
                padding: "1rem",
                display: "grid",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div
                  style={{
                    color: vertical.color,
                    fontFamily: M,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                  }}
                >
                  {vertical.n}
                </div>
                <div
                  style={{
                    color: vertical.color,
                    fontFamily: M,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {vertical.badge}
                </div>
              </div>

              <div style={{ color: W, fontFamily: S, fontSize: "1.08rem", fontWeight: 700 }}>
                {vertical.title}
              </div>

              <div
                style={{
                  color: "rgba(255,255,255,0.62)",
                  fontFamily: S,
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                {vertical.desc}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {vertical.tags.map((tag) => (
                  <div
                    key={tag}
                    style={{
                      padding: "0.35rem 0.55rem",
                      borderRadius: 999,
                      background: `${vertical.color}10`,
                      color: vertical.color,
                      fontFamily: M,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div>
            <Label>Asset Registry</Label>
            <div style={{ color: W, fontFamily: S, fontSize: "1.3rem", fontWeight: 800 }}>
              Live registry · 1 verified asset
            </div>
          </div>

          <button
            onClick={() => setDeep("registry")}
            style={{
              fontFamily: M,
              fontSize: "0.82rem",
              color: `${B}CC`,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            Open inspector →
          </button>
        </div>

        <button
          onClick={() => setDeep("asset")}
          style={{
            width: "100%",
            padding: "1.25rem 1.35rem",
            borderRadius: 8,
            border: `1px solid ${G}25`,
            background: `${G}05`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            cursor: "pointer",
            color: "inherit",
          }}
        >
          <div style={{ display: "grid", gap: "0.35rem", textAlign: "left" }}>
            <div style={{ fontFamily: M, color: G, fontSize: "0.78rem", fontWeight: 800 }}>
              AAS-1 · GENESIS ASSET · VERIFIED
            </div>
            <div style={{ color: W, fontFamily: S, fontSize: "1.25rem", fontWeight: 800 }}>
              Cielo Sunrise — $1,100,000
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: S, fontSize: "0.96rem" }}>
              Mineral Bluff, Georgia · 89/100 collateral score · $660K max borrow
            </div>
          </div>

          <div style={{ color: G, fontFamily: M, fontSize: "0.86rem", fontWeight: 800 }}>
            Inspect →
          </div>
        </button>
      </Section>

      <Section>
        <Label>Bring an asset into the protocol</Label>
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <h2
            style={{
              margin: 0,
              color: W,
              fontFamily: S,
              fontSize: "clamp(1.35rem, 2vw, 1.9rem)",
              fontWeight: 800,
            }}
          >
            Verification before tokenization.
          </h2>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.65)",
              fontFamily: S,
              fontSize: "1rem",
              lineHeight: 1.7,
              maxWidth: 780,
            }}
          >
            Owner-led onboarding for real estate, minerals, energy reserves, royalty interests,
            and other cash-flowing assets.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem" }}>
            <button
              onClick={() => setDeep("submit")}
              style={{
                padding: "0.82rem 1.35rem",
                borderRadius: 6,
                border: "none",
                background: G,
                color: "#000",
                fontFamily: M,
                fontSize: "0.92rem",
                fontWeight: 900,
                cursor: "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Start onboarding →
            </button>
            <button
              onClick={() => setDeep("trust")}
              style={{
                padding: "0.82rem 1.35rem",
                borderRadius: 6,
                border: `1px solid ${BDR}`,
                background: "transparent",
                color: "rgba(255,255,255,0.58)",
                fontFamily: M,
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              View trust layer
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function TerminalPage() {
  const [tab, setTab] = useState<Tab>("terminal");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: BG,
        color: W,
        fontFamily: S,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1rem" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0",
            borderBottom: `1px solid ${BDR}`,
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            {[
              { dot: G, text: "SOLANA MAINNET" },
              { dot: G, text: "AAS-1 PROTOCOL ACTIVE" },
              { dot: A, text: "REG A / D / CF READY" },
              { dot: B, text: "OWNERSHIP INFRASTRUCTURE" },
            ].map((item) => (
              <div
                key={item.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  color: "rgba(255,255,255,0.62)",
                  fontFamily: M,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: item.dot,
                    display: "inline-block",
                  }}
                />
                {item.text}
              </div>
            ))}
          </div>

          <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: M, fontSize: "0.72rem" }}>
            ABRAXAS OS · BUILD 2025.1
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.15rem" }}>
            <div
              style={{
                color: W,
                fontFamily: M,
                fontSize: "1.1rem",
                fontWeight: 900,
                letterSpacing: "0.12em",
              }}
            >
              ABRAXAS
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: M,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              PROTOCOL OS
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {[
              { id: "terminal" as const, label: "Terminal" },
              { id: "lending" as const, label: "Lending" },
            ].map((item) => {
              const active = tab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    padding: "0.55rem 0.95rem",
                    borderRadius: 5,
                    border: `1px solid ${active ? `${G}55` : BDR}`,
                    background: active ? `${G}12` : "transparent",
                    color: active ? G : "rgba(255,255,255,0.32)",
                    fontFamily: M,
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "terminal" ? <TerminalTab /> : <LendingTab />}
      </div>
    </main>
  );
}
