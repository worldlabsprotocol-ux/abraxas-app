"use client";
import React from "react";
import MineralRightsPanel from "@/components/MineralRightsPanel";
import PartnershipBadges from "@/components/PartnershipBadges";

export default function MineralsPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#060810",
      color: "#F1F5F9",
      padding: "40px 24px",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ color: "#10B981", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
            ABRAXAS PROTOCOL · ENERGY & MINERALS
          </div>
          <h1 style={{ color: "#F1F5F9", fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 8 }}>
            Reservation Mineral Rights
          </h1>
          <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Verification, tokenization, and collateral infrastructure for Native American
            reservation mineral assets on Sui. Post-discovery. Tribal-consent-first.
            On-chain royalties.
          </p>
        </div>

        {/* Stat Banner */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          {[
            { stat: "97%", label: "US nickel near tribal land" },
            { stat: "89%", label: "US copper near tribal land" },
            { stat: "79%", label: "US lithium near tribal land" },
            { stat: "7", label: "mineral verticals" },
            { stat: "55%", label: "LTV on mineral rights" },
            { stat: "500 $ABRA", label: "verification fee" },
          ].map(({ stat, label }) => (
            <div key={label} style={{
              background: "#0A0C10",
              border: "1px solid #1E293B",
              borderRadius: 10,
              padding: "14px 16px",
            }}>
              <div style={{ color: "#10B981", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{stat}</div>
              <div style={{ color: "#475569", fontSize: 10, lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Main 2-col layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 20,
          alignItems: "start",
        }}>
          {/* Left — Mineral Panel */}
          <MineralRightsPanel />

          {/* Right — Pipeline + Partnerships */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* 7-Stage Pipeline */}
            <div style={{
              background: "#0A0C10",
              border: "1px solid #1E293B",
              borderRadius: 12,
              padding: 18,
            }}>
              <div style={{ color: "#475569", fontSize: 9, letterSpacing: 2, marginBottom: 14 }}>
                AAS VERIFICATION PIPELINE
              </div>
              {[
                "Asset Submission",
                "Partner Review",
                "Provenance Validation",
                "Custody Assignment",
                "Risk Scoring",
                "Certificate Mint",
                "Collateral Activation",
              ].map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: i < 2 ? "rgba(16,185,129,0.2)" : "#0F172A",
                    border: `1px solid ${i < 2 ? "#10B981" : "#1E293B"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: i < 2 ? "#10B981" : "#475569",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ color: i < 2 ? "#CBD5E1" : "#475569", fontSize: 10 }}>{step}</div>
                </div>
              ))}
            </div>

            {/* Partnerships */}
            <PartnershipBadges />
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: 32,
          background: "linear-gradient(135deg, rgba(13,115,119,0.12), rgba(15,52,96,0.12))",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 12,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <div style={{ color: "#F1F5F9", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              Tokenize a Mineral Rights Position
            </div>
            <div style={{ color: "#64748B", fontSize: 11 }}>
              BIA-compliant · Tribal consent verified · AAS certificate on Sui
            </div>
          </div>
          <a href="/dashboard" style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: 8,
            padding: "10px 20px",
            color: "#10B981",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textDecoration: "none",
            display: "inline-block",
          }}>
            SUBMIT ASSET →
          </a>
        </div>

      </div>
    </div>
  );
}
