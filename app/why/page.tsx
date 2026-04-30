"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";

const LANDSCAPE = [
  {
    layer: "Layer 1",
    role: "IP Registration & Licensing",
    what: "Registers intellectual property on-chain, creates programmable licenses, and enables automated royalty routing between creators. These protocols define who owns what and under what terms.",
    gap: "Doesn't manage or compound the yield after registration. The IP is on-chain — but idle. No agent is operating the income stream.",
    icon: "◈",
    color: "rgba(107,140,255,0.08)",
    border: "rgba(107,140,255,0.2)",
  },
  {
    layer: "Layer 2",
    role: "Private Credit & Lending",
    what: "Unlocks liquidity from real-world assets through uncollateralized lending pools. Institutional-grade credit on-chain. 9–12% target returns. Assets serve as collateral.",
    gap: "Lends against your asset — capital leaves your hands. Doesn't operate the income stream the asset generates. The creator becomes a borrower, not an operator.",
    icon: "◉",
    color: "rgba(200,169,110,0.06)",
    border: "rgba(200,169,110,0.15)",
  },
  {
    layer: "Layer 3",
    role: "Tokenized Treasuries & Funds",
    what: "Wraps traditional financial instruments — government bonds, money markets — as on-chain tokens. Institutional entry points, high minimum thresholds, regulated structures.",
    gap: "Traditional assets only. No creative IP, no music royalties, no invoice factoring. Requires institutional access. Excludes independent creators entirely.",
    icon: "⬡",
    color: "rgba(61,214,140,0.05)",
    border: "rgba(61,214,140,0.15)",
  },
  {
    layer: "Layer 4",
    role: "IP Liquidity & DEX Layer",
    what: "Decentralized exchanges built for trading tokenized IP assets. Enables instant swaps, liquidity pools, and price discovery for IP tokens after they've been created.",
    gap: "Provides trading liquidity for IP tokens, but doesn't compound yield or operate the underlying income stream. The asset trades — but still sits idle between distributions.",
    icon: "⇄",
    color: "rgba(200,100,30,0.05)",
    border: "rgba(200,100,30,0.15)",
  },
];

const FAQS = [
  {
    q: "Where does each layer end and Abraxas begin?",
    a: "Layer 1 registers IP and defines ownership. Layer 2 lends against it. Layer 3 tokenizes traditional instruments. Layer 4 provides liquidity for trading. None of them operate the income stream after the asset is on-chain. That's Abraxas — the operating layer. Every royalty distribution, rent flow, and invoice settlement that clears while the asset sits idle in every other layer: Abraxas captures it, compounds it, and defends it. We sit at the intersection of all four layers and do what none of them do.",
  },
  {
    q: "How is this different from just holding and waiting for distributions?",
    a: "Holding means waiting 30–90 days for a distribution to hit your wallet. Abraxas means the agent captures that distribution the moment it clears and deploys it immediately. Over a year, the difference between sitting idle and continuously compounding at 8–12% APY is significant — not because of high-risk leverage, but because of operational efficiency. The money works every day instead of sitting in someone else's account.",
  },
  {
    q: "How does interest actually accrue?",
    a: "The vault agent monitors your asset class — streaming velocity for music, rent flows for real estate, invoice settlement for receivables. When distributions clear, the agent captures them and reinvests automatically. The Token-2022 InterestBearingMint extension records your yield rate on-chain so your balance compounds without manual action. Yield comes from the operating income of the underlying asset — not from speculation or leverage.",
  },
  {
    q: "What stops the system from collapsing if markets turn?",
    a: "Three layers of defense. First: circuit protection triggers automatically when any vault metric crosses a risk threshold — the agent reduces exposure before losses reach principal. Second: every vault maintains a reserve buffer (15–20% of TVL) held liquid and never deployed, absorbing shocks without touching your position. Third: Abraxas doesn't use leverage on underlying assets. When streaming revenue drops 30%, yield adjusts — but principal doesn't collapse because it was never in a leveraged trade.",
  },
  {
    q: "What happens if a major streaming platform changes its payout model?",
    a: "This is exactly what circuit defense was built for. The agent monitors streaming velocity across all platforms in real time. If any platform's per-stream rate drops below threshold, the agent automatically reweights to other income streams — sync licenses, YouTube Content ID, mechanical royalties. If total income drops enough to trigger the circuit, the agent reduces the deployed position and raises the reserve buffer. Every action is logged in the live feed in real time.",
  },
  {
    q: "Is my principal safe? How do I exit?",
    a: "Abraxas is non-custodial. Your Token-2022 position token lives in your wallet. The vault contract on Solana governs the mechanics. To exit, the position token is burned and capital returns to your wallet. The agent doesn't hold your funds in a custodial account. The rules are in the code, not in a terms of service. That's the design philosophy behind building on Token-2022 — programmatic guarantees, not trusted intermediaries.",
  },
  {
    q: "Who is Abraxas for — whales, degens, or artists?",
    a: "All three, with different entry points. Artists and creators use the /onboard flow to register their catalog, property, or invoice and operate it through a vault. Degens and yield seekers use the /earn pools — deposit USDC, receive abraSOUND or abraYIELD tokens, earn yield from the vault pool without registering an asset. Whales and institutions can operate directly through vaults with full agent assignment and circuit defense. The two-tier architecture means the protocol works for a first-time DistroKid artist and a $500K capital allocator simultaneously.",
  },
];

export default function WhyPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
          The operating layer
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 3rem)", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "1.25rem" }}>
          Where Abraxas sits<br />
          <span style={{ background: "linear-gradient(135deg, #c8a96e, #f0d98a, #c8a96e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            in the RWA stack.
          </span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", maxWidth: "560px", lineHeight: 1.7 }}>
          The RWA ecosystem has four distinct layers — IP registration, credit, institutional tokenization, and liquidity. All four layers tokenize assets. None of them operate the income stream once the asset is on-chain. That's the gap Abraxas fills.
        </p>
      </div>

      {/* Landscape */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
          The current ecosystem — and what each layer misses
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {LANDSCAPE.map((p) => (
            <div key={p.layer} style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.9rem" }}>{p.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{p.layer} — {p.role}</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "0.5rem" }}>{p.what}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--gold)", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>The gap: </span>{p.gap}
              </p>
            </div>
          ))}
        </div>

        {/* Abraxas position */}
        <div style={{ background: "linear-gradient(135deg, rgba(200,169,110,0.1), rgba(200,169,110,0.03))", border: "1px solid rgba(200,169,110,0.35)", borderRadius: "12px", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.5)", background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.3), transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 10px var(--gold)" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>Abraxas</span>
            <span style={{ fontSize: "0.65rem", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.3)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>Layer 5 — The Operating Layer</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "0.5rem" }}>
            Autonomous agents manage the income stream generated by on-chain registered assets.
            Royalties, rent flows, voice IP payouts, and invoice settlements are captured, reinvested,
            and defended automatically. The asset stays with its owner. The agent operates on their behalf.
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.7 }}>
            This is what happens after every other layer does its part.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
          How it actually works
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
          {FAQS.map((item, i) => (
            <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid var(--line)" : "none" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: open === i ? "var(--gold)" : "var(--text)", lineHeight: 1.4, flex: 1 }}>{item.q}</span>
                <span style={{ color: open === i ? "var(--gold)" : "var(--subtle)", fontSize: "0.8rem", flexShrink: 0, transition: "transform 0.2s", transform: open === i ? "rotate(45deg)" : "none" }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: "0 1.25rem 1.25rem" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.75 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.75rem" }}>
          Your asset is already earning. It's just not compounding.
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Register your catalog. An agent activates. The gap closes.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/onboard"><Button size="lg">Get Started →</Button></Link>
          <Link href="/earn"><Button size="lg" variant="ghost">Just Earn Yield</Button></Link>
        </div>
      </div>
    </div>
  );
}