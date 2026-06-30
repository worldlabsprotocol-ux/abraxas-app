"use client";
// FILE: components/terminal/StablecoinExplainer.tsx
// Plain-language explanation of stablecoins (USDC/USDT) for anyone who
// has never used crypto. Drop this anywhere a payment flow asks someone
// to send a stablecoin, it removes the "what is this" friction at the
// exact moment it would otherwise stop a non-crypto buyer.

import { S, G, W, BDR } from "./tokens";

interface StablecoinExplainerProps {
  compact?: boolean;
}

export function StablecoinExplainer({ compact = false }: StablecoinExplainerProps) {
  if (compact) {
    return (
      <div style={{ padding:"0.875rem", borderRadius:10,
                     background:"rgba(255,255,255,0.03)",
                     border:`1px solid ${BDR}`, marginBottom:"1rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.78rem", color:"rgba(21,21,26,0.6)",
                       lineHeight:1.65 }}>
          <strong style={{ color:W }}>USDC and USDT are digital dollars.</strong>{" "}
          Each one is designed to always equal $1, backed by real cash and
          short-term US treasuries held by the issuer. They move instantly
          over the internet like an email, instead of through a bank,
          which is why Abraxas uses them, fast, traceable, and always
          worth a dollar.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:"1.25rem", borderRadius:12,
                   background:"rgba(255,255,255,0.02)",
                   border:`1px solid ${BDR}` }}>
      <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                     color:W, marginBottom:"0.75rem" }}>
        New to stablecoins? Here's the short version.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {[
          { q:"What is it?", a:"A digital dollar. USDC and USDT are both designed to always be worth exactly $1, no price swings like Bitcoin or other crypto." },
          { q:"Why not just use a card?", a:"Stablecoins settle directly, often in seconds, with no card network fees and no chargebacks. For a platform built on Sui, it's also the native way value moves." },
          { q:"Is it safe?", a:"Both USDC and USDT are backed by real reserves (cash and short-term US treasuries) held by their issuers, and are among the most widely used digital assets in the world." },
          { q:"How do I get some?", a:"Any major exchange (Coinbase, Kraken, Binance) lets you buy USDC or USDT with a card or bank transfer, then send it to your Sui address." },
        ].map(item => (
          <div key={item.q}>
            <div style={{ fontFamily:S, fontSize:"0.8rem", fontWeight:600,
                           color:G, marginBottom:"0.25rem" }}>
              {item.q}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.78rem",
                           color:"rgba(21,21,26,0.5)", lineHeight:1.6 }}>
              {item.a}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
