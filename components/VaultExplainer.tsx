"use client";

import { useState } from "react";

/**
 * VaultExplainer. answers the most important user question:
 * "I minted the token. Why do I also need to deposit?"
 *
 * Shows on the deposit page as a collapsible explainer.
 * Jeff Yan principle: answer the doubt before they have it.
 */

const QUESTIONS = [
  {
    q: "I already minted a token. Why do I need to deposit?",
    a: "Minting the Token-2022 registers your asset on-chain. it proves you own the catalog, property, or invoice. But a token sitting in your wallet doesn't generate yield. Depositing capital into the vault is what activates the agent. The token represents ownership. The deposit is the fuel. Think of it like owning a rental property (token) vs. actually renting it out (deposit). You need both.",
  },
  {
    q: "How does interest actually accrue?",
    a: "The vault agent continuously monitors your asset class. streaming velocity for music, rent flows for real estate, invoice settlement for receivables. When distributions clear (royalty payouts, rent, invoice payments), the agent captures them and reinvests automatically. The interest accrues from the spread between when capital is deployed and when the underlying asset generates its next distribution. The Token-2022 InterestBearingMint extension records your yield rate on-chain. so your balance compounds without any manual action.",
  },
  {
    q: "What stops the system from collapsing if markets go bad?",
    a: "Three layers of defense. First: circuit protection triggers automatically if any vault metric crosses a risk threshold. volatility, drawdown, or liquidity dip. The agent reduces exposure before losses occur. Second: every vault maintains a reserve buffer. a portion of capital held liquid and not deployed, so even if the underlying asset underperforms, the buffer absorbs the shock. Third: Abraxas doesn't use leverage on the asset itself. The yield comes from operating income (royalties, rent, invoice spreads), not from speculation. When streaming revenue drops 30%, your vault yield drops. but your principal is not at risk.",
  },
  {
    q: "What happens if a music platform like Spotify changes its payout model?",
    a: "This is exactly what circuit defense was built for. The agent monitors streaming velocity across platforms in real time. If Spotify's per-stream rate drops below threshold, the agent automatically reweights to other income streams (sync licenses, YouTube Content ID, mechanical royalties). If the total income drops enough to trigger the circuit, the agent reduces the deployed position and raises the reserve buffer. You see every action in the live feed in real time. Nothing is hidden.",
  },
  {
    q: "Is my principal safe if I want to exit?",
    a: "Abraxas is non-custodial. Your Token-2022 position token represents your vault share and lives in your wallet. To exit, you sell or burn the position token. the vault unwinds your share and returns capital to your wallet. The agent doesn't hold your funds in a custodial account. The vault contract on Solana governs the mechanics, not Abraxas the company. This is why building on Token-2022 matters. the rules are in the code, not in a terms of service.",
  },
];

export function VaultExplainer() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--line)", background: "var(--raise)" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.2rem" }}>
          How it actually works
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Questions about vaults, yield, and protection
        </p>
      </div>

      {QUESTIONS.map((item, i) => (
        <div key={i} style={{ borderBottom: i < QUESTIONS.length - 1 ? "1px solid var(--line)" : "none" }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%", textAlign: "left",
              background: "none", border: "none", cursor: "pointer",
              padding: "1rem 1.25rem",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            }}
          >
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: open === i ? "var(--gold)" : "var(--text)", lineHeight: 1.4, flex: 1 }}>
              {item.q}
            </span>
            <span style={{ color: open === i ? "var(--gold)" : "var(--subtle)", fontSize: "0.75rem", flexShrink: 0, transition: "transform 0.2s", transform: open === i ? "rotate(45deg)" : "none" }}>
              +
            </span>
          </button>

          {open === i && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.75 }}>
                {item.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}