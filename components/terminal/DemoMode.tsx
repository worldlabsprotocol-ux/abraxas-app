"use client";
// FILE: components/terminal/DemoMode.tsx
// Automated guided walkthrough. Triggers on /terminal?demo=1. Auto-scrolls
// through each section in sequence with a caption bubble, pausing on each
// for a fixed duration so it can be screen-recorded and posted to X.
// Click anywhere or press Escape to stop early.

import { useState, useEffect, useRef } from "react";
import { M, S, G, BDR } from "./tokens";

interface DemoStep {
  selector: string;
  caption: string;
  duration: number;
}

const STEPS: DemoStep[] = [
  { selector: "#demo-hero",       caption: "Verify your identity once. Use the credential everywhere.", duration: 4500 },
  { selector: "#demo-milestones", caption: "How it works: verify once, then transact everywhere.", duration: 4500 },
  { selector: "#demo-deals",      caption: "Submitting an asset takes four steps — watch it cycle.", duration: 5000 },
  { selector: "#demo-assets",     caption: "Verified assets — real property, royalties, and IP.", duration: 5000 },
  { selector: "#demo-wyoming",    caption: "Form a business on-chain in minutes.", duration: 4000 },
  { selector: "#demo-music",      caption: "Music catalog audits for artists and publishers.", duration: 4000 },
];

export function DemoMode() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setActive(true);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    function stop() { setActive(false); }
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") stop(); });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (stepIdx >= STEPS.length) {
      setActive(false);
      return;
    }
    const step = STEPS[stepIdx];
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    timerRef.current = setTimeout(() => {
      setStepIdx(i => i + 1);
    }, step.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, stepIdx]);

  if (!active) return null;

  const step = STEPS[stepIdx];
  if (!step) return null;

  return (
    <div
      onClick={() => setActive(false)}
      style={{ position:"fixed", bottom:"2rem", left:"50%",
                transform:"translateX(-50%)", zIndex:5000,
                cursor:"pointer", maxWidth:"min(420px,90vw)" }}
    >
      <div style={{ background:"#0A0C10", border:`1px solid ${G}40`,
                     borderRadius:10, padding:"0.875rem 1.125rem",
                     boxShadow:`0 0 30px ${G}25`,
                     display:"flex", alignItems:"center", gap:"0.75rem" }}>
        <div style={{ width:8, height:8, borderRadius:"50%",
                       background:G, flexShrink:0,
                       animation:"demo-pulse 1.4s ease-in-out infinite" }} />
        <div style={{ fontFamily:S, fontSize:"0.78rem", color:"#fff",
                       lineHeight:1.4 }}>
          {step.caption}
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:"0.25rem",
                     marginTop:"0.5rem" }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ width: i === stepIdx ? 16 : 6, height:3,
                                 borderRadius:2,
                                 background: i <= stepIdx ? G : "rgba(255,255,255,0.15)",
                                 transition:"width 0.3s" }} />
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:"0.5rem",
                     fontFamily:M, fontSize:"0.5rem",
                     color:"rgba(255,255,255,0.25)",
                     letterSpacing:"0.08em" }}>
        CLICK OR ESC TO STOP
      </div>
      <style>{`
        @keyframes demo-pulse {
          0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
      `}</style>
    </div>
  );
}
