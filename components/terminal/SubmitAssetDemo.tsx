"use client";
// FILE: components/terminal/SubmitAssetDemo.tsx
// Inline, always-visible automated walkthrough of the asset submission flow.
// Auto-cycles through 4 steps on a loop so a visitor immediately understands
// how Abraxas works without clicking anything. Click "Start for real" to
// jump into the actual onboarding flow.

import { useState, useEffect } from "react";
import { S, G, B, A, W, BDR, CARD, softShadow } from "./tokens";
import { Button } from "./ui";

interface SubmitAssetDemoProps {
  onStart: () => void;
}

const STEPS = [
  {
    title: "Describe the asset",
    detail: "Property, royalty stream, mineral rights, IP, or any income-producing asset.",
    color: G,
    mock: { field: "Asset type", value: "Real estate · Townhome" },
  },
  {
    title: "Our team verifies it",
    detail: "Title, appraisal, public records, and ownership are checked before anything is listed.",
    color: B,
    mock: { field: "Verification", value: "In review · 2-5 business days" },
  },
  {
    title: "Get a lending score",
    detail: "A transparent score investors and lenders can actually rely on.",
    color: A,
    mock: { field: "Collateral score", value: "89 / 100" },
  },
  {
    title: "Open to investors",
    detail: "Once verified, your asset can raise capital directly on Abraxas.",
    color: "#8B5CF6",
    mock: { field: "Status", value: "Investor participation open" },
  },
];

export function SubmitAssetDemo({ onStart }: SubmitAssetDemoProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % STEPS.length), 3200);
    return () => clearInterval(t);
  }, []);

  const current = STEPS[step];

  return (
    <div style={{ borderRadius:16, overflow:"hidden",
                   background:"rgba(16,185,129,0.06)",
                   border:`1px solid ${BDR}` }}>
      <div style={{ padding:"1.5rem 1.5rem 1.25rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:G, marginBottom:"0.5rem" }}>
          See how it works
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(1.1rem,2.5vw,1.4rem)",
                       fontWeight:700, color:W, marginBottom:"0.5rem" }}>
          Submitting an asset takes four steps.
        </div>
        <div style={{ fontFamily:S, fontSize:"0.85rem",
                       color:"rgba(255,255,255,0.5)", lineHeight:1.6,
                       maxWidth:480 }}>
          This is a live preview, not a video. Watch it cycle, or jump straight
          into the real thing.
        </div>
      </div>

      <div style={{ padding:"0 1.5rem 1.5rem" }}>
        <div style={{ borderRadius:12, background:CARD,
                       border:`1px solid ${BDR}`, overflow:"hidden",
                       boxShadow: softShadow(current.color) }}>
          {/* Step indicator dots */}
          <div style={{ display:"flex", gap:"0.375rem",
                         padding:"1rem 1.25rem 0" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ flex:1, height:3, borderRadius:2,
                                     background: i <= step ? current.color : "rgba(255,255,255,0.1)",
                                     transition:"background 0.4s" }} />
            ))}
          </div>

          <div style={{ padding:"1.25rem 1.25rem 1.5rem",
                         display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div>
              <div style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:600,
                             color: current.color, marginBottom:"0.25rem" }}>
                Step {step + 1} of {STEPS.length}
              </div>
              <div style={{ fontFamily:S, fontSize:"1.05rem", fontWeight:700,
                             color:W, marginBottom:"0.375rem" }}>
                {current.title}
              </div>
              <div style={{ fontFamily:S, fontSize:"0.8rem",
                             color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                {current.detail}
              </div>
            </div>

            {/* Mock form field, simulating the actual product */}
            <div style={{ padding:"0.875rem 1rem", borderRadius:10,
                           background:"rgba(255,255,255,0.03)",
                           border:`1px solid ${current.color}25` }}>
              <div style={{ fontFamily:S, fontSize:"0.62rem",
                             color:"rgba(255,255,255,0.35)", marginBottom:"0.3rem" }}>
                {current.mock.field}
              </div>
              <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:600,
                             color: current.color }}>
                {current.mock.value}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop:"1.125rem" }}>
          <Button onClick={onStart} color={G} size="md">
            Start for real →
          </Button>
        </div>
      </div>
    </div>
  );
}
