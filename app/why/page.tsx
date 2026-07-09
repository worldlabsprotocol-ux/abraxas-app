"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";

const GAPS = [
  {
    icon: "◎",
    problem: "Assets tokenized. Yield sitting idle.",
    stat: "$36B in tokenized RWAs",
    statSub: "most earn nothing between distributions",
    solution: "Abraxas agents operate the income stream continuously. Every distribution is captured and redeployed the moment it clears. not 30-90 days later.",
    color: "rgba(200,169,110,0.08)",
    border: "rgba(200,169,110,0.3)",
  },
  {
    icon: "⬡",
    problem: "Institutional-only access.",
    stat: "Most RWA protocols",
    statSub: "gate access behind institutional minimums",
    solution: "abraSOUND and abraYIELD pools start at $50 USDC. No KYC. No accreditation. If you can connect a wallet, you can earn from real-world assets.",
    color: "rgba(61,214,140,0.06)",
    border: "rgba(61,214,140,0.2)",
  },
  {
    icon: "◈",
    problem: "Cross-chain fragmentation.",
    stat: "1–3% pricing gaps",
    statSub: "for identical assets across chains",
    solution: "Abraxas verification is Sui-native. zkLogin sign-in, low-cost transactions, sponsored gas for verified tiers, and Move Passport objects on-chain. One verification layer. One credential.",
    color: "rgba(107,140,255,0.07)",
    border: "rgba(107,140,255,0.2)",
  },
  {
    icon: "◉",
    problem: "Tokenization without active management.",
    stat: "Low transfer activity",
    statSub: "most RWA tokens are held passively",
    solution: "Tokenization is the start, not the finish. An Abraxas agent manages your position continuously. rebalancing, reinvesting, and defending. while the token stays in your wallet.",
    color: "rgba(200,169,110,0.06)",
    border: "rgba(200,169,110,0.2)",
  },
];

const LANDSCAPE = [
  {
    layer: "Layer 1", role: "IP Registration & Licensing",
    what: "Registers IP on-chain, creates programmable licenses, enables automated royalty routing between creators.",
    gap: "Doesn't operate the income stream after registration. The IP is on-chain. but idle.",
    icon: "◈", color: "rgba(107,140,255,0.07)", border: "rgba(107,140,255,0.18)",
  },
  {
    layer: "Layer 2", role: "Private Credit & Lending",
    what: "Unlocks liquidity through uncollateralized lending pools. Institutional-grade credit on-chain. Assets serve as collateral.",
    gap: "Lends against your asset. capital leaves your hands. Doesn't operate the income stream the asset generates.",
    icon: "◉", color: "rgba(200,169,110,0.05)", border: "rgba(200,169,110,0.14)",
  },
  {
    layer: "Layer 3", role: "Tokenized Treasuries & Institutions",
    what: "Wraps government bonds and money markets as on-chain tokens. Institutional access with high minimum thresholds.",
    gap: "Traditional assets only. Excludes independent creators. Minimum investment thresholds block retail participants.",
    icon: "⬡", color: "rgba(61,214,140,0.04)", border: "rgba(61,214,140,0.14)",
  },
  {
    layer: "Layer 4", role: "IP Liquidity & Trading",
    what: "DEXs built for tokenized IP assets. instant swaps, liquidity pools, price discovery for IP tokens.",
    gap: "Provides trading markets for IP tokens, but doesn't compound yield or operate the underlying income stream.",
    icon: "⇄", color: "rgba(200,100,30,0.04)", border: "rgba(200,100,30,0.14)",
  },
];

const FAQS = [
  {
    q: "What does 'operating the income stream' actually mean?",
    a: "Every royalty, rent payment, or invoice settlement has a gap between when it's earned and when it's paid out. typically 30–90 days. During that gap, your money sits in a distributor's account earning nothing. Abraxas's agent monitors that income stream and deploys capital against it, capturing distributions the moment they clear. The agent doesn't just hold. it continuously rebalances, reinvests, and defends your position. That's the difference between tokenization and operation.",
  },
  {
    q: "How is this different from just holding tokenized assets?",
    a: "Holding a tokenized asset passively is identical to holding the original asset. you wait for distributions, you receive them quarterly, you do nothing in between. Abraxas operates the position: distributions are reinvested immediately, income-stream velocity is monitored continuously, and circuit defense triggers if risk crosses a threshold. Over 12 months, the difference between passive holding and active operation at 8–12% APY is compounding. not speculation.",
  },
  {
    q: "Why does Sui matter for this use case?",
    a: "zkLogin lets users sign in with Google. no seed phrase, no browser extension. while still getting a real on-chain Sui address for their Passport. Sui's object model fits the Passport stamp bitmask natively, and transaction costs stay low enough that verification anchoring and sponsored actions for verified tiers are economically viable at scale.",
  },
  {
    q: "What stops the system from collapsing in a down market?",
    a: "Three layers: circuit defense triggers before losses reach principal, a 15–20% reserve buffer absorbs shocks without touching deployed capital, and Abraxas never uses leverage on underlying assets. Yield comes from operating income. royalties, rent, invoice spreads. not speculation. When streaming revenue drops 30%, yield adjusts proportionally. Principal doesn't collapse because it was never in a leveraged position.",
  },
  {
    q: "Who is this actually for?",
    a: "Three audiences with three entry points. Artists, creators, and asset owners use /onboard to register their catalog, property, or invoice. the agent operates the income stream on their behalf. Yield seekers with no asset use /earn pools to deposit USDC and earn from the vault pool. minimum $50, no registration required. Whales and institutions operate directly through full vault assignments with custom agent parameters and circuit defense thresholds. The same protocol serves all three simultaneously.",
  },
  {
    q: "Is this legal?",
    a: "Abraxas does not take custody of your assets, does not issue securities, and does not make investment decisions on your behalf in a fiduciary capacity. The agent executes according to on-chain rules that you set at deposit. The Token-2022 position token is a representation of your vault share. not a security. That said, regulatory environments vary by jurisdiction and are evolving rapidly. We recommend consulting legal counsel in your jurisdiction before making large deposits. The protocol is currently in beta.",
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
          The gaps nobody else<br />
          <span style={{ background: "linear-gradient(135deg, #c8a96e, #f0d98a, #c8a96e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            is solving.
          </span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", maxWidth: "560px", lineHeight: 1.7 }}>
          The RWA market hit $36B and is growing 340% year over year. But the research is clear: most tokenized assets sit idle, most protocols are institutional-only, and nobody is operating the income stream after tokenization. That's exactly where Abraxas lives.
        </p>
      </div>

      {/* The 4 gaps */}
      <div style={{ marginBottom: "3.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
          Four gaps in a $36B market
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {GAPS.map((g) => (
            <div key={g.problem} style={{ background: g.color, border: `1px solid ${g.border}`, borderRadius: "12px", padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "1.25rem", alignItems: "start" }} className="gap-grid">
              <span style={{ fontSize: "1.25rem", color: "var(--gold)", lineHeight: 1, marginTop: "2px" }}>{g.icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>{g.problem}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 600 }}>{g.stat}</p>
                <p style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>{g.statSub}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.25rem" }}>Abraxas</p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{g.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Landscape */}
      <div style={{ marginBottom: "3.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
          The ecosystem. and what each layer misses
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {LANDSCAPE.map((p) => (
            <div key={p.layer} style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "1.1rem 1.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem" }}>{p.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{p.layer}. {p.role}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "0.35rem" }}>{p.what}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--gold)", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>The gap: </span>{p.gap}
              </p>
            </div>
          ))}
        </div>

        {/* Abraxas = Layer 5 */}
        <div style={{ background: "linear-gradient(135deg, rgba(200,169,110,0.1), rgba(200,169,110,0.03))", border: "1px solid rgba(200,169,110,0.35)", borderRadius: "12px", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.5)", background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.3), transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Abraxas</span>
            <span style={{ fontSize: "0.62rem", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.3)", padding: "0.12rem 0.45rem", borderRadius: "4px" }}>Layer 5. The Operating Layer</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.7 }}>
            Autonomous agents manage the income stream generated by on-chain registered assets. Royalties, rent flows, voice IP payouts, and invoice settlements are captured, reinvested, and defended automatically. The asset stays with the owner. The agent operates on their behalf.
          </p>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.7, marginTop: "0.5rem" }}>
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
          The gap is real. The infrastructure is live. The question is what you do with it.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/onboard"><Button size="lg">Operate an Asset →</Button></Link>
          <Link href="/earn"><Button size="lg" variant="ghost">Just Earn Yield</Button></Link>
        </div>
      </div>
    </div>
  );
}