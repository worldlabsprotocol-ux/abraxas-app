"use client";

import Link from "next/link";
import { Button } from "@/components/Button";

const LANDSCAPE = [
  {
    name: "Story Protocol",
    role: "IP Registration Layer",
    what: "Registers intellectual property on-chain. Creates programmable licenses. Enables automated royalty routing between creators.",
    gap: "Doesn't manage or compound the yield after registration. The IP is on-chain — but idle.",
    color: "rgba(107,140,255,0.08)",
    border: "rgba(107,140,255,0.2)",
  },
  {
    name: "Goldfinch",
    role: "Private Credit Protocol",
    what: "Uncollateralized lending to real-world businesses. Institutional-grade private credit on-chain. 9–12% target returns.",
    gap: "Lends against assets. Doesn't operate the income stream those assets generate. Capital leaves the creator's hands.",
    color: "rgba(200,169,110,0.06)",
    border: "rgba(200,169,110,0.15)",
  },
  {
    name: "Ondo Finance",
    role: "Tokenized Treasuries",
    what: "Wraps US Treasuries and institutional bonds as on-chain tokens. $2.75B TVL. Institutional focus.",
    gap: "Traditional assets only. No creative IP, no music royalties, no invoice factoring. Requires institutional entry.",
    color: "rgba(61,214,140,0.05)",
    border: "rgba(61,214,140,0.15)",
  },
  {
    name: "Maple Finance",
    role: "Institutional Credit Markets",
    what: "On-chain lending pools for institutional borrowers. Undercollateralized credit for vetted entities.",
    gap: "Focused on corporate credit. No creator economy, no IP rights, no individual asset operators.",
    color: "rgba(200,100,30,0.06)",
    border: "rgba(200,100,30,0.15)",
  },
];

const FAQS = [
  {
    q: "Where does Story Protocol end and Abraxas begin?",
    a: "Story Protocol is the registration and licensing layer. It puts IP rights on-chain and defines who owns what. Abraxas is what happens after — the operating layer that takes those registered rights and actively manages the income they generate. Think of it as: Story is the deed. Abraxas is the property manager. You need both.",
  },
  {
    q: "How is Abraxas different from Goldfinch?",
    a: "Goldfinch lends against your assets — you give up control of your capital in exchange for liquidity. Abraxas doesn't take your capital. You keep the asset. The agent manages the income stream that asset generates. No loan, no collateral, no counterparty risk. Goldfinch moves money. Abraxas operates it.",
  },
  {
    q: "Why Solana and not Ethereum?",
    a: "Token-2022 on Solana is the right standard for this use case — it supports InterestBearingMint (yield rate encoded directly in the token), TransferHooks (programmable actions on every transfer), and on-chain metadata. These extensions make Abraxas's position tokens genuinely different from an ERC-20. Solana's transaction throughput also means agent actions can execute continuously without $50 gas fees making micro-optimizations unprofitable.",
  },
  {
    q: "How does the royalty advance model work?",
    a: "An artist with a DistroKid catalog earning $2,000/quarter has capital that's idle for 60–90 days before each payout. Abraxas advances 80% of the projected next distribution immediately — the artist gets liquidity now. When the distribution clears, Abraxas captures the 20% spread plus yield generated on the deployed capital during the hold period. The artist gets more money sooner. Abraxas earns on the operational float. No speculation, no leverage — just the spread between when money is earned and when it's paid out.",
  },
  {
    q: "What about screenwriters, directors, authors?",
    a: "The model is identical. WGA residuals, book royalty advances, film licensing backend — all of these are income streams that arrive quarterly and sit idle between payouts. Every one of them is a vault waiting to be activated. The asset class doesn't change the mechanism. The agent tracks the income source, captures distributions, reinvests, and defends against income stream risk. We're starting with music because the data infrastructure is most mature. Film, TV, and publishing follow the same pattern.",
  },
  {
    q: "How does circuit defense actually prevent collapse?",
    a: "Three layers, in order. First: the agent monitors income stream velocity in real time. If streaming revenue drops 25% in a 7-day window, the agent reduces the deployed position and raises the reserve buffer — before the drop reaches a principal-threatening level. Second: every vault maintains a reserve buffer (typically 15–20% of TVL) that is never deployed, purely held liquid to absorb shocks. Third: Abraxas doesn't use leverage on the underlying asset. The yield comes from operating income, not from speculative positions. When markets correct, yield adjusts — but principal doesn't collapse because it was never in a leveraged trade.",
  },
];

export default function WhyPage() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
          The operating layer
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 3rem)", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "1.25rem" }}>
          Where Abraxas sits in<br />
          <span style={{ background: "linear-gradient(135deg, #c8a96e, #f0d98a, #c8a96e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            the RWA stack.
          </span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", maxWidth: "560px", lineHeight: 1.7 }}>
          Story Protocol registers IP. Goldfinch lends against it. Ondo tokenizes Treasuries.
          Nobody operates the income stream once the asset is on-chain.
          That's Abraxas.
        </p>
      </div>

      {/* Landscape comparison */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
          The current landscape
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {LANDSCAPE.map((p) => (
            <div key={p.name} style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.name}</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--subtle)", marginLeft: "0.5rem" }}>{p.role}</span>
                </div>
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
            <span style={{ fontSize: "0.68rem", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.3)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>The Operating Layer</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7 }}>
            Autonomous agents manage the income stream generated by on-chain registered assets.
            Royalties, rent flows, and invoice settlements are captured, reinvested, and defended automatically.
            The asset stays with its owner. The agent operates on their behalf.
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.7, marginTop: "0.5rem" }}>
            This is what happens after Story, Goldfinch, and Ondo do their part.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
          How it actually works
        </p>
        <FAQ items={FAQS} />
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.75rem" }}>
          Ready to operate?
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Register your catalog. An agent activates. Your income compounds.
        </p>
        <Link href="/onboard"><Button size="lg">Get Started →</Button></Link>
      </div>
    </div>
  );
}

function FAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none" }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: open === i ? "var(--gold)" : "var(--text)", lineHeight: 1.4, flex: 1 }}>{item.q}</span>
            <span style={{ color: open === i ? "var(--gold)" : "var(--subtle)", fontSize: "0.75rem", flexShrink: 0, transition: "transform 0.2s", transform: open === i ? "rotate(45deg)" : "none" }}>+</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.75 }}>{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Need React for useState in FAQ
import React from "react";