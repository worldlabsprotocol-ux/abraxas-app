"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { useAuth } from "@/lib/authState";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { ABRA } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * $ABRA Staking — Maple Finance insight:
 * Revenue buybacks + staking = aligned incentives.
 * Clearpool insight: staking to oracle pools earns yield.
 *
 * No smart contract needed yet — wallet balance check determines tier.
 * Real staking mechanics activate at graduation.
 */

const TIERS = [
  {
    name: "Initiate",
    min: 0,
    max: 9_999,
    color: "var(--subtle)",
    bg: "rgba(255,255,255,0.02)",
    border: "var(--line)",
    perks: [
      "Access to all public vaults",
      "Standard deposit limits",
      "Live feed access",
    ],
    badge: null,
  },
  {
    name: "Operator",
    min: 10_000,
    max: 99_999,
    color: "var(--green)",
    bg: "rgba(61,214,140,0.06)",
    border: "rgba(61,214,140,0.25)",
    perks: [
      "Priority access to new vaults (24hr early)",
      "Reduced platform fees (10% discount)",
      "Operator badge on profile",
      "Featured in leaderboard",
    ],
    badge: "◎",
  },
  {
    name: "Architect",
    min: 100_000,
    max: 999_999,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.06)",
    border: "rgba(167,139,250,0.25)",
    perks: [
      "48hr early vault access",
      "25% fee reduction",
      "Architect badge — permanent on-chain",
      "Direct line to protocol updates",
      "abraSOUND/abraYIELD boosted APY (+2%)",
    ],
    badge: "⬡",
  },
  {
    name: "Sovereign",
    min: 1_000_000,
    max: Infinity,
    color: "var(--gold)",
    bg: "rgba(200,169,110,0.08)",
    border: "rgba(200,169,110,0.35)",
    perks: [
      "72hr early vault access — first in every launch",
      "50% fee reduction",
      "Sovereign badge — rarest on Abraxas",
      "Custom vault naming rights",
      "Protocol governance weighting",
      "abraSOUND/abraYIELD boosted APY (+5%)",
    ],
    badge: "◉",
  },
];

function StakingContent() {
  const router = useRouter();
  const { walletConnected } = useAuth();
  const portfolio = usePortfolioData();
  const abraBalance = portfolio.abra ?? 0;

  const currentTier = [...TIERS].reverse().find((t) => abraBalance >= t.min) ?? TIERS[0];
  const nextTier = TIERS.find((t) => t.min > abraBalance);
  const progressToNext = nextTier
    ? Math.min(100, (abraBalance / nextTier.min) * 100)
    : 100;

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2.5rem 1.25rem 5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
          $ABRA Staking
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.75rem)", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
          Hold more. Access more.
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", maxWidth: "480px", lineHeight: 1.7 }}>
          $ABRA holdings determine your operator tier. Higher tiers unlock earlier vault access, reduced fees, and APY boosts on earn pools.
        </p>
      </div>

      {/* Current status */}
      {walletConnected && (
        <div style={{
          background: `linear-gradient(135deg, ${currentTier.bg}, rgba(255,255,255,0.01))`,
          border: `1px solid ${currentTier.border}`,
          borderRadius: "14px", padding: "1.5rem 1.75rem",
          marginBottom: "2rem", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: `linear-gradient(90deg, transparent, ${currentTier.color}, transparent)` }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Current Tier</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {currentTier.badge && <span style={{ fontSize: "1.25rem", color: currentTier.color }}>{currentTier.badge}</span>}
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: currentTier.color }}>{currentTier.name}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Your Balance</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.1rem", color: "var(--gold)" }}>
                {abraBalance.toLocaleString()} $ABRA
              </p>
            </div>
          </div>

          {nextTier && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--subtle)", marginBottom: "0.4rem" }}>
                <span>{currentTier.name}</span>
                <span>{nextTier.name} at {nextTier.min.toLocaleString()} $ABRA</span>
              </div>
              <div style={{ height: "4px", background: "var(--line)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressToNext}%`, background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`, borderRadius: "2px", transition: "width 1s ease" }} />
              </div>
              <p style={{ fontSize: "0.68rem", color: "var(--subtle)", marginTop: "0.4rem" }}>
                {(nextTier.min - abraBalance).toLocaleString()} more $ABRA to reach {nextTier.name}
              </p>
            </div>
          )}

          {!nextTier && (
            <p style={{ fontSize: "0.75rem", color: "var(--gold)", fontWeight: 600 }}>
              Maximum tier reached. You are a Sovereign operator.
            </p>
          )}
        </div>
      )}

      {/* All tiers */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
        {TIERS.map((tier) => {
          const isActive = walletConnected && currentTier.name === tier.name;
          return (
            <div key={tier.name} style={{
              background: isActive ? tier.bg : "var(--surface)",
              border: `1px solid ${isActive ? tier.border : "var(--line)"}`,
              borderRadius: "12px", padding: "1.25rem 1.5rem",
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {tier.badge && <span style={{ fontSize: "1rem", color: isActive ? tier.color : "var(--subtle)" }}>{tier.badge}</span>}
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: isActive ? tier.color : "var(--text)" }}>{tier.name}</span>
                  {isActive && (
                    <span style={{ fontSize: "0.58rem", background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40`, padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Current
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "var(--muted)" }}>
                  {tier.min === 0 ? "0+" : tier.min.toLocaleString()} $ABRA
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {tier.perks.map((perk) => (
                  <span key={perk} style={{ fontSize: "0.68rem", color: isActive ? tier.color : "var(--muted)", background: isActive ? `${tier.color}10` : "rgba(255,255,255,0.03)", border: `1px solid ${isActive ? tier.color + "25" : "rgba(255,255,255,0.06)"}`, borderRadius: "4px", padding: "0.2rem 0.5rem" }}>
                    {perk}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Protocol revenue share — Maple-inspired */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
          Protocol revenue sharing — activating at graduation
        </p>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7 }}>
          25% of all vault fees will be allocated to a buy-and-distribute program for $ABRA holders when the protocol graduates from beta. This creates a direct alignment between the protocol's success and the value of $ABRA — the more capital flowing through Abraxas, the more value accrues to holders. No inflation. No team unlock ahead of users.
        </p>
      </div>

      {/* CTA */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a href={ABRA.bags} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
          <Button fullWidth size="lg">Buy $ABRA on Bags</Button>
        </a>
        <Button size="lg" variant="ghost" onClick={() => router.push("/abra")} style={{ flex: 1 }}>
          View Token Details
        </Button>
      </div>
    </div>
  );
}

export default function StakePage() {
  return (
    <WalletGate requireWallet={false}>
      <StakingContent />
    </WalletGate>
  );
}