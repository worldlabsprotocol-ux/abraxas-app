"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { VAULT_YIELD_RATES } from "@/lib/usePortfolioData";

const TRACKS = [
  {
    key: "music",
    icon: "♪",
    title: "Music & IP Royalties",
    tagline: "Your royalties sit idle for 30–90 days before reaching you. Abraxas puts them to work during that wait.",
    description: "DistroKid, UnitedMasters, TuneCore — they hold your money for weeks before paying out. That's your capital sitting in someone else's account earning nothing. Abraxas assigns an agent to your catalog that captures every distribution the moment it clears, reinvests it automatically, and defends against streaming platform risk — without giving up ownership of a single track.",
    examples: ["Independent artist on DistroKid or UnitedMasters", "Producer with licensed beats or sync placements", "Label with multi-artist catalog", "Publisher with performance or mechanical royalties"],
    vaultId: "490",
    apy: VAULT_YIELD_RATES["490"],
    steps: [
      { n: "01", title: "Register your catalog", desc: "Name your asset, upload your PRO registration, distribution agreement, or on-chain proof. Takes 3 minutes." },
      { n: "02", title: "AGENT-001 activates", desc: "Your agent monitors streaming velocity, licensing pipeline, and distribution cycles from every platform simultaneously." },
      { n: "03", title: "Every dollar compounds", desc: "Distributions are captured the moment they clear. Reinvested automatically. Every action is logged in real time — no black box." },
      { n: "04", title: "Platform risk is defended", desc: "If a streaming platform cuts payouts or shifts its algorithm, your agent reduces exposure before the damage reaches your position." },
    ],
    cta: "Register Music Catalog",
    listType: "music",
    color: "rgba(200,169,110,0.12)",
    borderColor: "rgba(200,169,110,0.3)",
  },
  {
    key: "realestate",
    icon: "◻",
    title: "Real Estate",
    tagline: "Property generates rent. Agents manage the rest.",
    description: "You have a real estate position — residential rental, commercial lease, or a fractional ownership. Abraxas tokenizes the income stream, not just the deed. Your agent captures rent flows, manages vacancy hedging, and reinvests at the right time.",
    examples: ["Rental property owner", "Commercial real estate LP", "Short-term rental operator", "Real estate fund participant"],
    vaultId: "492",
    apy: VAULT_YIELD_RATES["492"],
    steps: [
      { n: "01", title: "Document your position", desc: "Provide deed, lease agreement, or LP interest document as proof." },
      { n: "02", title: "AGENT-003 activates", desc: "Agent begins monitoring rent flows, occupancy rates, and regional market conditions." },
      { n: "03", title: "Rent becomes capital", desc: "Monthly distributions are captured, logged, and reinvested per your risk parameters." },
      { n: "04", title: "Vacancy protection fires", desc: "Liquidity dips and vacancy spikes trigger reserve buffer raises before losses occur." },
    ],
    cta: "Register Real Estate",
    listType: "realestate",
    color: "rgba(107,140,255,0.08)",
    borderColor: "rgba(107,140,255,0.2)",
  },
  {
    key: "receivables",
    icon: "◈",
    title: "Receivables & Invoices",
    tagline: "Outstanding invoices are capital. Deploy them.",
    description: "You have outstanding invoices, payment contracts, or receivables that are sitting idle. Abraxas scores the counterparty risk, finances the receivable, and uses the spread to generate yield — while your agent rotates out of positions if credit quality drops.",
    examples: ["Freelancer with outstanding invoices", "Small business with net-30/60 terms", "Contractor with milestone payments", "Agency with retainer contracts"],
    vaultId: "493",
    apy: VAULT_YIELD_RATES["493"],
    steps: [
      { n: "01", title: "Submit invoice batch", desc: "Upload invoices or connect payment platform. AGENT-004 scores counterparty risk." },
      { n: "02", title: "Position financed", desc: "Capital deployed against the receivable. You receive the advance, agent holds the position." },
      { n: "03", title: "Settlement captured", desc: "When invoices settle, yield is logged and reinvested automatically." },
      { n: "04", title: "Credit rotation", desc: "If counterparty score drops, agent rotates to higher-quality positions without manual action." },
    ],
    cta: "Register Receivables",
    listType: "receivables",
    color: "rgba(61,214,140,0.06)",
    borderColor: "rgba(61,214,140,0.18)",
  },
  {
    key: "voice",
    icon: "◉",
    title: "Voice & AI IP",
    tagline: "Your voice earns on ElevenLabs. Abraxas compounds it.",
    description: "You earn royalties from your cloned voice on ElevenLabs or similar platforms. Those payouts arrive monthly and sit idle between cycles. Abraxas captures each distribution the moment it clears and reinvests automatically. Voice IP is the newest royalty asset class and it's unaddressed by any other protocol.",
    examples: ["Voice actors with ElevenLabs Voice Library", "Narrators earning from AI audiobooks", "Podcast hosts with licensed voice models", "Artists with AI vocal IP"],
    vaultId: "490",
    apy: VAULT_YIELD_RATES["490"],
    steps: [
      { n: "01", title: "Register your voice IP", desc: "Submit your ElevenLabs Voice Library ID or proof of voice licensing. AGENT-001 activates." },
      { n: "02", title: "Payout tracking begins", desc: "Agent monitors Voice Library usage metrics and pending monthly payouts." },
      { n: "03", title: "Distributions compounded", desc: "Each payout is captured and reinvested. Every cycle logged in real time." },
      { n: "04", title: "Platform risk defended", desc: "If ElevenLabs changes payout rates, agent reweights to other AI voice licensing income streams." },
    ],
    cta: "Register Voice IP",
    listType: "voice",
    color: "rgba(200,169,110,0.07)",
    borderColor: "rgba(200,169,110,0.22)",
  },
];

export default function OnboardPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const track = TRACKS.find((t) => t.key === selected);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
          Get Started
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
          What do you want to operate?
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", maxWidth: "520px", lineHeight: 1.7 }}>
          Abraxas turns passive assets into actively managed capital. Pick your asset type and we'll show you exactly what happens from here.
        </p>
      </div>

      {/* Track selector */}
      {!selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
          {TRACKS.map((t) => (
            <div
              key={t.key}
              onClick={() => setSelected(t.key)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "1.75rem 2rem",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.borderColor;
                (e.currentTarget as HTMLElement).style.background = t.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              }}
            >
              <div style={{ fontSize: "2rem", flexShrink: 0, width: "2.5rem", textAlign: "center" }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.2rem" }}>{t.title}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{t.tagline}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--green)" }}>{t.apy}%</div>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>APY</div>
              </div>
              <div style={{ color: "var(--subtle)", fontSize: "1rem" }}>→</div>
            </div>
          ))}
        </div>
      )}

      {/* Track detail */}
      {selected && track && (
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{ fontSize: "0.75rem", color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            ← Back
          </button>

          <div style={{ background: track.color, border: `1px solid ${track.borderColor}`, borderRadius: "14px", padding: "2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "2rem" }}>{track.icon}</span>
              <div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", marginBottom: "0.2rem" }}>
                  {track.title}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{track.apy}% APY</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>· VAULT-{track.vaultId.padStart(3, "0").slice(-3)} · AGENT-00{TRACKS.indexOf(track) + 1}</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.75 }}>{track.description}</p>
          </div>

          {/* Who this is for */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>
              Who this is for
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.5rem" }}>
              {track.examples.map((ex) => (
                <div key={ex} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                  <span style={{ color: "var(--gold)", fontSize: "0.5rem" }}>●</span>
                  {ex}
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>
              How it works
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {track.steps.map((step, i) => (
                <div key={step.n} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: "1.5rem",
                    fontStyle: "italic",
                    color: "var(--gold)",
                    lineHeight: 1,
                    flexShrink: 0,
                    width: "2rem",
                  }}>
                    {step.n}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{step.title}</div>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Token-2022 note */}
          <div style={{ background: "rgba(107,140,255,0.05)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.7 }}>
              <span style={{ color: "var(--nebula)", fontWeight: 600 }}>Token-2022 on Solana. </span>
              Your asset position is represented as a Token-2022 token — Solana's programmable token standard that supports transfer hooks, interest-bearing tokens, and on-chain metadata. This is what makes the yield mechanism possible without a centralized intermediary. You retain full ownership. Abraxas is non-custodial.
            </p>
          </div>

          {/* CTA */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Button
              size="lg"
              fullWidth
              onClick={() => router.push(`/list?type=${track.listType}`)}
            >
              {track.cta}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => router.push(`/vault/${track.vaultId}`)}
              style={{ minWidth: "160px" }}
            >
              View Vault →
            </Button>
          </div>
        </div>
      )}

      {/* Bottom context — only when no track selected */}
      {!selected && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "2rem" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--subtle)", textAlign: "center", lineHeight: 1.7 }}>
            All positions are non-custodial. Your agent operates on your behalf — you retain ownership of the underlying asset.<br />
            Circuit defense activates automatically if risk thresholds are crossed. $0 unrecovered across all vaults.
          </p>
        </div>
      )}
    </div>
  );
}