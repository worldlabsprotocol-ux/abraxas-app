"use client";
// Capital tab — Borrow against tokenized RWAs via Loopscale


import { useState, useEffect } from "react";
import { useAbraStore, type AbraAsset } from "@/lib/abraxasStore";


const fmtUsd = (v: number) =>
  v >= 1_000_000
    ? `\[ {(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000
      ? ` \]{(v / 1_000).toFixed(1)}K`
      : `$${v.toFixed(0)}`;


export function LoopscaleBorrowSimulator() {
  const = useState<string | null>(null);
  const assets = useAbraStore((s) => s.assets);


  const eligible = assets.filter((a) => a.status !== "closed");


  const totalBorrowable = eligible.reduce(
    (sum, a) => sum + Math.round(a.estimatedUsd * (a.ltv || 55) / 100),
    0
  );


  const selectedAsset = eligible.find((a) => a.id === selected);


  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f0f0f0", marginBottom: "0.5rem" }}>
          Borrow Against Your RWAs
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            padding: "0.2rem 0.65rem",
            background: "rgba(107,140,255,0.1)",
            border: "1px solid rgba(107,140,255,0.25)",
            borderRadius: "6px",
            fontSize: "0.48rem",
            fontWeight: 700,
            color: "#6b8cff",
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            POWERED BY LOOPSCALE
          </span>
        </div>
        <p style={{ fontSize: "0.55rem", color: "#888", marginTop: "0.75rem", lineHeight: 1.5 }}>
          Tokenized assets can be used as collateral to borrow USDC instantly.
          No selling required.
        </p>
      </div>


      {/* Stats */}
      {eligible.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.75rem",
          padding: "1rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px"
        }}>
          { ,
            ["Total Borrowable", fmtUsd(totalBorrowable)], , ].map(( ) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f0f0f0" }}>
                {value}
              </div>
              <div style={{ fontSize: "0.4rem", color: "#666", marginTop: "4px", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Asset Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {eligible.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#555" }}>
            No assets available to borrow against yet.<br />
            Tokenize assets in the Studio tab to get started.
          </div>
        ) : (
          eligible.map((asset) => {
            const borrowAmount = Math.round(asset.estimatedUsd * (asset.ltv || 55) / 100);
            const isSelected = selected === asset.id;


            return (
              <div
                key={asset.id}
                onClick={() => setSelected(isSelected ? null : asset.id)}
                style={{
                  background: isSelected ? "rgba(107,140,255,0.08)" : "rgba(255,255,255,0.03)",
                  border: isSelected ? "1px solid #6b8cff" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "1rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ fontSize: "0.48rem", color: "#888", marginBottom: "0.25rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {asset.assetClass?.toUpperCase()}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f0f0f0", marginBottom: "0.5rem" }}>
                  {asset.name}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f0f0f0" }}>
                  {fmtUsd(asset.estimatedUsd)}
                </div>
                <div style={{ fontSize: "0.52rem", color: "#14F195", marginTop: "0.25rem" }}>
                  Up to {fmtUsd(borrowAmount)} USDC · {asset.ltv || 55}% LTV
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* Selected Asset Preview */}
      {selectedAsset && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1.25rem",
          background: "rgba(107,140,255,0.06)",
          borderRadius: "12px",
          border: "1px solid rgba(107,140,255,0.2)"
        }}>
          <div style={{ fontSize: "0.5rem", color: "#6b8cff", fontWeight: 700, marginBottom: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}>
            BORROW PREVIEW — {selectedAsset.name}
          </div>
          <div style={{ fontSize: "0.95rem", color: "#14F195", fontWeight: 700 }}>
            Max Borrow: {fmtUsd(Math.round(selectedAsset.estimatedUsd * (selectedAsset.ltv || 55) / 100))} USDC
          </div>
        </div>
      )}


      {/* CTA Button */}
      <button
        onClick={() => window.open("https://app.loopscale.com", "_blank", "noopener")}
        style={{
          width: "100%",
          marginTop: "2rem",
          padding: "1.1rem",
      
    background: "linear-gradient(90deg, #6b8cff, #14F195)",
          color: "#000",
          border: "none",
          borderRadius: "10px",
          fontWeight: 800,
          fontSize: "0.85rem",
          cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.03em"
        }}
      >
        CONTINUE TO LOOPSCALE →
      </button>
    </div>
  );
}
