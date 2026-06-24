"use client";
// FILE: components/terminal/OnboardingChoice.tsx
// From the original audit, never built until now: "what do you want to
// do" as plain options, not "connect wallet" or "sign in." Three plain
// paths, no jargon, no branching complexity beyond picking one.

import { useState } from "react";
import { S, G, B, A, W, BDR } from "./tokens";

interface OnboardingChoiceProps {
  onInvest: () => void;
  onSubmitAsset: () => void;
  onLookAround: () => void;
}

const PATHS = [
  {
    id: "invest", color: G,
    title: "Invest in something",
    desc: "Browse verified real estate, royalties, and IP, and put stablecoin into one directly.",
    steps: ["Pick an asset", "Sign in with email", "Send stablecoin, we confirm"],
  },
  {
    id: "submit", color: B,
    title: "Get my own asset verified",
    desc: "Real estate, a music catalog, mineral rights, a business, anything real.",
    steps: ["Tell us what it is", "Our team verifies it", "It becomes investable"],
  },
  {
    id: "look", color: A,
    title: "Just look around",
    desc: "See what's already verified before deciding anything.",
    steps: ["Browse the marketplace", "No sign-in required", "Come back anytime"],
  },
];

export function OnboardingChoice({ onInvest, onSubmitAsset, onLookAround }: OnboardingChoiceProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  function go(id: string) {
    if (id === "invest") onInvest();
    else if (id === "submit") onSubmitAsset();
    else onLookAround();
  }

  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:W, marginBottom:"0.375rem" }}>
        What do you want to do?
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(21,21,26,0.45)", marginBottom:"1.25rem" }}>
        Pick one, no account needed yet.
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
                     gap:"0.875rem" }}>
        {PATHS.map(p => (
          <button key={p.id} onClick={() => go(p.id)}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ textAlign:"left", padding:"1.125rem", borderRadius:12,
                      border: hovered === p.id ? `1.5px solid ${p.color}` : `1px solid ${BDR}`,
                      background: hovered === p.id ? `${p.color}0D` : "rgba(255,255,255,0.02)",
                      cursor:"pointer", transition:"all 0.15s" }}>
            <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                           color:W, marginBottom:"0.5rem" }}>
              {p.title}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.76rem",
                           color:"rgba(21,21,26,0.45)", lineHeight:1.6,
                           marginBottom:"0.875rem" }}>
              {p.desc}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
              {p.steps.map((step, i) => (
                <div key={step} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <span style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:700,
                                  color:p.color, width:14 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily:S, fontSize:"0.72rem",
                                  color:"rgba(21,21,26,0.5)" }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
