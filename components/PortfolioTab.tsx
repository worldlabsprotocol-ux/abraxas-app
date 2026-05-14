// FILE: components/PortfolioTab.tsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAbraStore } from "@/lib/abraxasStore";
import { useAbraBalance, ABRA_GATE } from "@/lib/hooks/useAbraBalance";

const STATUS_LABEL: Record<
  string,
  { label: string; color: string; pct: number }
> = {
  created: {
    label: "Submitted",
    color: "#C8A96E",
    pct: 20,
  },
  pending_soft: {
    label: "Initial Review",
    color: "#FBBF24",
    pct: 40,
  },
  pending_standard: {
    label: "Custody Verification",
    color: "#FBBF24",
    pct: 60,
  },
  verified: {
    label: "Verified",
    color: "#14F195",
    pct: 80,
  },
  collateral_eligible: {
    label: "Borrow Eligible",
    color: "#14F195",
    pct: 100,
  },
  borrowed: {
    label: "Active Loan",
    color: "#8B5CF6",
    pct: 100,
  },
  closed: {
    label: "Closed",
    color: "rgba(255,255,255,0.3)",
    pct: 0,
  },
};

const CAT_COLOR: Record<string, string> = {
  Watches: "#8B5CF6",
  Spirits: "#F59E0B",
  "Cards (PSA/BGS)": "#FBBF24",
  "Comics (CGC)": "#A855F7",
  Racehorses: "#22C55E",
  Metals: "#D4AF37",
  Art: "#F472B6",
  Other: "#C8A96E",
};

function fmt(n: number) {
  if (!n || n <= 0) return "0";
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

function fmtUsd(n: number) {
  if (!n || n <= 0) return "$0";

  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }

  if (n >= 1000) {
    return `$${(n / 1000).toFixed(0)}K`;
  }

  return `$${n.toFixed(0)}`;
}

export function PortfolioTab({
  onTokenize,
}: {
  onTokenize?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  const { connected } = useWallet();

  const { balance, loading: balLoading, meetsGate } = useAbraBalance();

  const assets = useAbraStore((s) => s.assets || []);
  const storeABRA = useAbraStore((s) => s.abraBalance || 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const totalSpent = assets.reduce(
    (sum, asset) => sum + (asset.mintCostAbra || 0),
    0
  );

  const totalValue = assets.reduce(
    (sum, asset) => sum + (asset.estimatedUsd || 0),
    0
  );

  const totalBorrowable = assets.reduce(
    (sum, asset) =>
      sum +
      Math.round(
        ((asset.estimatedUsd || 0) * (asset.ltv || 0)) / 100
      ),
    0
  );

  const displayBalance = connected ? balance : storeABRA;

  const qualifies = connected
    ? meetsGate
    : storeABRA >= ABRA_GATE;

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        paddingBottom: "4rem",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(139,92,246,0.8)",
            marginBottom: "0.5rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Abraxas Portfolio
        </div>

        <h1
          style={{
            fontSize: "2.4rem",
            fontWeight: 900,
            lineHeight: 1,
            margin: 0,
            color: "#ffffff",
            letterSpacing: "-0.05em",
          }}
        >
          Tokenized Asset Registry
        </h1>

        <p
          style={{
            marginTop: "1rem",
            maxWidth: 640,
            lineHeight: 1.8,
            color: "rgba(255,255,255,0.42)",
            fontSize: "0.92rem",
          }}
        >
          Tokenize real-world assets on Solana. Verify ownership.
          Unlock lending liquidity. Track your on-chain portfolio
          through institutional-grade validation infrastructure.
        </p>
      </div>

      {/* ABRA STATUS */}
      <div
        style={{
          background:
            "linear-gradient(145deg, rgba(16,18,34,0.98), rgba(10,10,18,0.98))",
          border: qualifies
            ? "1px solid rgba(20,241,149,0.22)"
            : "1px solid rgba(244,63,94,0.22)",
          borderRadius: 18,
          padding: "1.25rem 1.4rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.64rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.34)",
                marginBottom: "0.45rem",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {connected
                ? "Connected Wallet Balance"
                : "Portfolio Preview"}
            </div>

            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 900,
                color: qualifies ? "#14F195" : "#F87171",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {balLoading ? "Loading..." : fmt(displayBalance)} ABRA
            </div>

            {!qualifies && (
              <div
                style={{
                  marginTop: "0.4rem",
                  color: "#F87171",
                  fontSize: "0.72rem",
                }}
              >
                Minimum requirement:{" "}
                {ABRA_GATE.toLocaleString()} ABRA
              </div>
            )}
          </div>

          <div
            style={{
              padding: "0.65rem 0.9rem",
              borderRadius: 10,
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.18)",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: "0.62rem",
                marginBottom: "0.3rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Mint Cost
            </div>

            <div
              style={{
                fontWeight: 900,
                color: "#C4B5FD",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              100K ABRA
            </div>
          </div>
        </div>
      </div>

      {/* METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {[
          {
            label: "Assets",
            value: assets.length.toString(),
            color: "#ffffff",
          },
          {
            label: "Portfolio Value",
            value: fmtUsd(totalValue),
            color: "#C4B5FD",
          },
          {
            label: "ABRA Spent",
            value: `${fmt(totalSpent)} ABRA`,
            color: "#FBBF24",
          },
          {
            label: "Borrow Capacity",
            value: `${fmtUsd(totalBorrowable)}`,
            color: "#14F195",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "rgba(12,14,28,0.96)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "1rem",
            }}
          >
            <div
              style={{
                color: metric.color,
                fontSize: "1.2rem",
                fontWeight: 900,
                marginBottom: "0.35rem",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {metric.value}
            </div>

            <div
              style={{
                fontSize: "0.68rem",
                color: "rgba(255,255,255,0.32)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {assets.length === 0 ? (
        <div
          style={{
            borderRadius: 22,
            padding: "4rem 2rem",
            textAlign: "center",
            background:
              "linear-gradient(180deg, rgba(10,12,24,0.98), rgba(5,6,12,0.98))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "0.8rem",
            }}
          >
            No Assets Tokenized
          </div>

          <p
            style={{
              maxWidth: 540,
              margin: "0 auto 2rem auto",
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.8,
            }}
          >
            Watches, spirits, trading cards, comics, metals,
            and collectibles are transitioning on-chain.
            Tokenize your first asset to establish verified
            ownership and unlock borrowing infrastructure.
          </p>

          <button
            onClick={() => onTokenize?.()}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 12,
              padding: "0.95rem 1.6rem",
              background:
                "linear-gradient(135deg,#8B5CF6,#6D28D9)",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: "0.82rem",
              letterSpacing: "0.04em",
            }}
          >
            Tokenize Asset
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {assets.map((asset) => {
            const status =
              STATUS_LABEL[asset.status] ||
              STATUS_LABEL.created;

            const categoryColor =
              CAT_COLOR[asset.assetClass] || "#8B5CF6";

            const maxBorrow = Math.round(
              ((asset.estimatedUsd || 0) *
                (asset.ltv || 0)) /
                100
            );

            return (
              <div
                key={asset.id}
                style={{
                  background:
                    "linear-gradient(145deg, rgba(10,12,24,0.98), rgba(5,6,12,0.98))",
                  border: `1px solid ${categoryColor}22`,
                  borderRadius: 18,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.04)",
                      flexShrink: 0,
                    }}
                  >
                    {asset.imagePreview ? (
                      <img
                        src={asset.imagePreview}
                        alt={asset.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: categoryColor,
                          fontSize: "1.6rem",
                        }}
                      >
                        ◈
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 240,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.6rem",
                          color: categoryColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontFamily:
                            "'JetBrains Mono', monospace",
                        }}
                      >
                        {asset.assetClass}
                      </div>

                      <div
                        style={{
                          fontSize: "0.58rem",
                          color: status.color,
                          background: `${status.color}12`,
                          border: `1px solid ${status.color}30`,
                          padding: "0.18rem 0.45rem",
                          borderRadius: 999,
                          fontFamily:
                            "'JetBrains Mono', monospace",
                        }}
                      >
                        {status.label}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#ffffff",
                        marginBottom: "0.4rem",
                      }}
                    >
                      {asset.name}
                    </div>

                    <div
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.7rem",
                        lineHeight: 1.6,
                        fontFamily:
                          "'JetBrains Mono', monospace",
                      }}
                    >
                      {asset.txSignature
                        ? `TX: ${asset.txSignature.slice(
                            0,
                            18
                          )}...`
                        : "Awaiting transaction confirmation"}
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 140,
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 900,
                        color: "#ffffff",
                        fontFamily:
                          "'JetBrains Mono', monospace",
                      }}
                    >
                      {fmtUsd(asset.estimatedUsd || 0)}
                    </div>

                    <div
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.62rem",
                        marginBottom: "0.8rem",
                      }}
                    >
                      declared value
                    </div>

                    <div
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 900,
                        color: "#14F195",
                        fontFamily:
                          "'JetBrains Mono', monospace",
                      }}
                    >
                      {fmtUsd(maxBorrow)}
                    </div>

                    <div
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.62rem",
                      }}
                    >
                      borrow capacity
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    height: 3,
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: `${status.pct}%`,
                      height: "100%",
                      background: status.color,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
